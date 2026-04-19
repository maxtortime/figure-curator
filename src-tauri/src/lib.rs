pub mod crawler;

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use crawler::{get_crawlers, CrawledProduct};

// ── 유틸 ─────────────────────────────────────────────────

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

// ── 검색 이력 ─────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub keyword: String,
    pub timestamp: u64,
    pub total_count: usize,
    pub available_count: usize,
    pub products: Vec<CrawledProduct>,
    #[serde(default)]
    pub notify: bool,
}

fn history_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| ".".into()).join("search_history.json")
}

fn load_history_from_file(app: &tauri::AppHandle) -> Vec<HistoryEntry> {
    let path = history_path(app);
    std::fs::read_to_string(&path).ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_history_to_file(app: &tauri::AppHandle, entries: &[HistoryEntry]) {
    let path = history_path(app);
    if let Some(p) = path.parent() { let _ = std::fs::create_dir_all(p); }
    if let Ok(json) = serde_json::to_string(entries) { let _ = std::fs::write(&path, json); }
}

// ── 캐시 ─────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    timestamp: u64,
    products: Vec<CrawledProduct>,
}

#[derive(Serialize)]
pub struct CachedResult {
    pub products: Vec<CrawledProduct>,
    pub age_secs: u64,
}

fn cache_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| ".".into()).join("cache")
}

fn safe_filename(keyword: &str) -> String {
    keyword.chars().map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect()
}

fn save_cache(app: &tauri::AppHandle, keyword: &str, products: &[CrawledProduct]) {
    let dir = cache_dir(app);
    let _ = std::fs::create_dir_all(&dir);
    let entry = CacheEntry { timestamp: now_ms(), products: products.to_vec() };
    if let Ok(json) = serde_json::to_string(&entry) {
        let _ = std::fs::write(dir.join(format!("{}.json", safe_filename(keyword))), json);
    }
}

fn load_cache(app: &tauri::AppHandle, keyword: &str) -> Option<CacheEntry> {
    let path = cache_dir(app).join(format!("{}.json", safe_filename(keyword)));
    std::fs::read_to_string(&path).ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

// ── 백그라운드 Job ─────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct ShopProgress {
    pub shop_name: String,
    pub status: String, // "pending" | "running" | "done" | "failed"
    pub product_count: usize,
    pub pages_done: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CrawlJob {
    pub id: String,
    pub keyword: String,
    pub started_at: u64,
    pub status: String, // "running" | "done" | "failed"
    pub shops: Vec<ShopProgress>,
    pub total_count: usize,
    pub restock_count: usize,
    pub restock_items: Vec<String>,
}

pub type JobStore = Arc<Mutex<HashMap<String, CrawlJob>>>;

fn update_shop(jobs: &JobStore, job_id: &str, shop_name: &str, f: impl FnOnce(&mut ShopProgress)) {
    if let Ok(mut lock) = jobs.lock() {
        if let Some(job) = lock.get_mut(job_id) {
            if let Some(shop) = job.shops.iter_mut().find(|s| s.shop_name == shop_name) {
                f(shop);
            }
        }
    }
}

// ── 백그라운드 크롤 실행 ──────────────────────────────────

const BG_MAX_PAGES: u32 = 50;
const BG_TIMEOUT_SECS: u64 = 30;
const PERIODIC_INTERVAL_MINS: u64 = 30;

async fn do_background_crawl(
    job_id: String,
    keyword: String,
    notify: bool,
    old_soldout: HashSet<String>,
    app: tauri::AppHandle,
    jobs: JobStore,
) {
    let crawlers = get_crawlers();
    let kw = Arc::new(keyword.clone());

    let handles: Vec<_> = crawlers.into_iter().map(|crawler| {
        let kw = kw.clone();
        let job_id = job_id.clone();
        let app = app.clone();
        let jobs = jobs.clone();
        tokio::spawn(async move {
            let shop_name = crawler.shop_name().to_string();
            update_shop(&jobs, &job_id, &shop_name, |s| s.status = "running".into());
            let _ = app.emit("job-shop-start", serde_json::json!({ "job_id": &job_id, "shop_name": &shop_name }));

            let mut shop_products: Vec<CrawledProduct> = Vec::new();
            let mut seen_ids: HashSet<String> = HashSet::new();

            for page in 1..=BG_MAX_PAGES {
                let res = tokio::time::timeout(
                    Duration::from_secs(BG_TIMEOUT_SECS),
                    crawler.search_page(&kw, page),
                ).await;

                match res {
                    Ok(Ok(products)) if !products.is_empty() => {
                        let before = shop_products.len();
                        for p in products {
                            let key = format!("{}-{}", p.shop_id, p.source_product_id);
                            if seen_ids.insert(key) { shop_products.push(p); }
                        }
                        let added = shop_products.len() - before;
                        update_shop(&jobs, &job_id, &shop_name, |s| {
                            s.product_count = shop_products.len();
                            s.pages_done = page;
                        });
                        let _ = app.emit("job-shop-progress", serde_json::json!({
                            "job_id": &job_id, "shop_name": &shop_name,
                            "count": shop_products.len(), "page": page
                        }));
                        if added == 0 { break; } // 빈 페이지 = 마지막
                    }
                    _ => break,
                }
            }

            let total = shop_products.len();
            update_shop(&jobs, &job_id, &shop_name, |s| {
                s.status = "done".into();
                s.product_count = total;
            });
            let _ = app.emit("job-shop-done", serde_json::json!({
                "job_id": &job_id, "shop_name": &shop_name, "count": total
            }));
            shop_products
        })
    }).collect();

    let mut all_products: Vec<CrawledProduct> = Vec::new();
    for h in handles {
        if let Ok(products) = h.await { all_products.extend(products); }
    }

    // 가격 정규화
    for p in &mut all_products {
        if p.price.map_or(false, |v| v <= 1) { p.is_sold_out = true; p.price = None; }
    }

    // 재입고 감지
    let restock_items: Vec<String> = if notify {
        all_products.iter()
            .filter(|p| !p.is_sold_out && old_soldout.contains(&format!("{}-{}", p.shop_id, p.source_product_id)))
            .map(|p| p.name.chars().take(25).collect::<String>())
            .take(5)
            .collect()
    } else { vec![] };

    // 캐시 저장
    save_cache(&app, &keyword, &all_products);

    let total = all_products.len();
    let restock_count = restock_items.len();

    // OS 알림
    if notify && !restock_items.is_empty() {
        use tauri_plugin_notification::NotificationExt;
        let body = format!("{}개 상품 재입고: {}", restock_count, restock_items.join(", "));
        let _ = app.notification().builder()
            .title(&format!("[{}] 재입고 알림", keyword))
            .body(&body)
            .show();
    }

    // Job 상태 갱신
    if let Ok(mut lock) = jobs.lock() {
        if let Some(job) = lock.get_mut(&job_id) {
            job.status = "done".into();
            job.total_count = total;
            job.restock_count = restock_count;
            job.restock_items = restock_items.clone();
        }
    }

    let _ = app.emit("job-complete", serde_json::json!({
        "job_id": &job_id,
        "keyword": &keyword,
        "total": total,
        "restock_count": restock_count,
        "restock_items": &restock_items,
    }));
}

// ── Tauri 커맨드 ──────────────────────────────────────────

#[tauri::command]
async fn search(keyword: String, app: tauri::AppHandle) -> Result<Vec<CrawledProduct>, String> {
    if keyword.trim().is_empty() { return Ok(vec![]); }
    let crawlers = get_crawlers();
    let kw = Arc::new(keyword.clone());

    let handles: Vec<_> = crawlers.into_iter().map(|crawler| {
        let kw = kw.clone();
        tokio::spawn(async move {
            tokio::time::timeout(Duration::from_secs(30), crawler.search(&kw)).await
        })
    }).collect();

    let mut all_products: Vec<CrawledProduct> = Vec::new();
    for handle in handles {
        if let Ok(Ok(Ok(products))) = handle.await { all_products.extend(products); }
    }
    for p in &mut all_products {
        if p.price.map_or(false, |v| v <= 1) { p.is_sold_out = true; p.price = None; }
    }

    // 캐시 저장
    save_cache(&app, &keyword, &all_products);

    // 이력 저장
    let timestamp = now_ms();
    let available_count = all_products.iter().filter(|p| !p.is_sold_out).count();
    let preview: Vec<CrawledProduct> = all_products.iter()
        .filter(|p| !p.is_sold_out && !p.images.is_empty())
        .take(6).cloned().collect();

    let notify = {
        let history = load_history_from_file(&app);
        history.iter().find(|e| e.keyword.to_lowercase() == keyword.to_lowercase())
            .map(|e| e.notify).unwrap_or(false)
    };

    let entry = HistoryEntry { keyword: keyword.trim().to_string(), timestamp, total_count: all_products.len(), available_count, products: preview, notify };
    let mut history = load_history_from_file(&app);
    history.retain(|e| e.keyword.to_lowercase() != entry.keyword.to_lowercase());
    history.insert(0, entry);
    history.truncate(10);
    save_history_to_file(&app, &history);

    Ok(all_products)
}

#[tauri::command]
async fn load_history(app: tauri::AppHandle) -> Vec<HistoryEntry> {
    load_history_from_file(&app)
}

#[tauri::command]
async fn get_cached(keyword: String, app: tauri::AppHandle) -> Option<CachedResult> {
    let cache = load_cache(&app, &keyword)?;
    let age_secs = now_ms().saturating_sub(cache.timestamp) / 1000;
    Some(CachedResult { products: cache.products, age_secs })
}

#[tauri::command]
async fn start_background_crawl(
    keyword: String,
    notify: bool,
    app: tauri::AppHandle,
    jobs: tauri::State<'_, JobStore>,
) -> Result<String, String> {
    let jobs_arc = jobs.inner().clone();
    // job_id를 미리 생성해서 프론트에 반환 (spawn_crawl_for_keyword는 내부에서 새 ID 생성)
    spawn_crawl_for_keyword(keyword, notify, app, jobs_arc);
    Ok(uuid::Uuid::new_v4().to_string())
}

#[tauri::command]
async fn get_jobs(jobs: tauri::State<'_, JobStore>) -> Result<Vec<CrawlJob>, String> {
    let lock = jobs.lock().unwrap();
    let mut list: Vec<CrawlJob> = lock.values().cloned().collect();
    list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(list)
}

#[tauri::command]
async fn toggle_notification(keyword: String, enabled: bool, app: tauri::AppHandle) {
    let mut history = load_history_from_file(&app);
    for entry in &mut history {
        if entry.keyword.to_lowercase() == keyword.to_lowercase() {
            entry.notify = enabled;
        }
    }
    save_history_to_file(&app, &history);
}

// ── 주기적 크롤 ──────────────────────────────────────────

fn spawn_crawl_for_keyword(keyword: String, notify: bool, app: tauri::AppHandle, jobs: JobStore) {
    let old_soldout: HashSet<String> = load_cache(&app, &keyword)
        .map(|c| c.products.iter()
            .filter(|p| p.is_sold_out)
            .map(|p| format!("{}-{}", p.shop_id, p.source_product_id))
            .collect())
        .unwrap_or_default();

    let crawlers = get_crawlers();
    let shops: Vec<ShopProgress> = crawlers.iter().map(|c| ShopProgress {
        shop_name: c.shop_name().to_string(),
        status: "pending".into(),
        product_count: 0,
        pages_done: 0,
    }).collect();

    let job_id = uuid::Uuid::new_v4().to_string();
    let job = CrawlJob {
        id: job_id.clone(),
        keyword: keyword.clone(),
        started_at: now_ms(),
        status: "running".into(),
        shops,
        total_count: 0,
        restock_count: 0,
        restock_items: vec![],
    };
    jobs.lock().unwrap().insert(job_id.clone(), job);

    let app_clone = app.clone();
    let jobs_clone = jobs.clone();
    tauri::async_runtime::spawn(async move {
        do_background_crawl(job_id, keyword, notify, old_soldout, app_clone, jobs_clone).await;
    });
}

fn start_periodic_crawl(app: tauri::AppHandle, jobs: JobStore) {
    tauri::async_runtime::spawn(async move {
        // 앱 초기화 대기 후 첫 크롤 실행
        tokio::time::sleep(Duration::from_secs(10)).await;
        loop {
            let history = load_history_from_file(&app);
            let notify_keywords: Vec<String> = history.into_iter()
                .filter(|e| e.notify)
                .map(|e| e.keyword)
                .collect();

            for keyword in notify_keywords {
                spawn_crawl_for_keyword(keyword, true, app.clone(), jobs.clone());
                tokio::time::sleep(Duration::from_secs(5)).await;
            }

            tokio::time::sleep(Duration::from_secs(PERIODIC_INTERVAL_MINS * 60)).await;
        }
    });
}

// ── 앱 진입점 ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(Arc::new(Mutex::new(HashMap::<String, CrawlJob>::new())) as JobStore)
        .setup(|app| {
            let handle = app.handle().clone();
            let jobs = app.state::<JobStore>().inner().clone();
            start_periodic_crawl(handle, jobs);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search,
            load_history,
            get_cached,
            start_background_crawl,
            get_jobs,
            toggle_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
