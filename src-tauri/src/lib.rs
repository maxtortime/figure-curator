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

fn upsert_history(app: &tauri::AppHandle, keyword: &str, products: &[CrawledProduct]) {
    let timestamp = now_ms();
    let available_count = products.iter().filter(|p| !p.is_sold_out).count();
    let preview: Vec<CrawledProduct> = products.iter()
        .filter(|p| !p.is_sold_out && !p.images.is_empty())
        .take(6).cloned().collect();

    let entry = HistoryEntry {
        keyword: keyword.trim().to_string(),
        timestamp,
        total_count: products.len(),
        available_count,
        products: preview,
    };
    let mut history = load_history_from_file(app);
    history.retain(|e| e.keyword.to_lowercase() != entry.keyword.to_lowercase());
    history.insert(0, entry);
    history.truncate(10);
    save_history_to_file(app, &history);
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

async fn do_background_crawl(
    job_id: String,
    keyword: String,
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
                        if added == 0 { break; }
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

    for p in &mut all_products {
        if p.price.map_or(false, |v| v <= 1) { p.is_sold_out = true; p.price = None; }
    }

    save_cache(&app, &keyword, &all_products);
    upsert_history(&app, &keyword, &all_products);

    let total = all_products.len();

    if let Ok(mut lock) = jobs.lock() {
        if let Some(job) = lock.get_mut(&job_id) {
            job.status = "done".into();
            job.total_count = total;
        }
    }

    let _ = app.emit("job-complete", serde_json::json!({
        "job_id": &job_id,
        "keyword": &keyword,
        "total": total,
    }));
}

// ── Tauri 커맨드 ──────────────────────────────────────────

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
    app: tauri::AppHandle,
    jobs: tauri::State<'_, JobStore>,
) -> Result<String, String> {
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
    };
    jobs.lock().unwrap().insert(job_id.clone(), job);

    let jid = job_id.clone();
    let app_clone = app.clone();
    let jobs_clone = jobs.inner().clone();
    tauri::async_runtime::spawn(async move {
        do_background_crawl(jid, keyword, app_clone, jobs_clone).await;
    });

    Ok(job_id)
}

#[tauri::command]
async fn get_jobs(jobs: tauri::State<'_, JobStore>) -> Result<Vec<CrawlJob>, String> {
    let lock = jobs.lock().unwrap();
    let mut list: Vec<CrawlJob> = lock.values().cloned().collect();
    list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(list)
}

// ── 앱 진입점 ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(Mutex::new(HashMap::<String, CrawlJob>::new())) as JobStore)
        .invoke_handler(tauri::generate_handler![
            load_history,
            get_cached,
            start_background_crawl,
            get_jobs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
