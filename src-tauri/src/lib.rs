pub mod crawler;

use std::sync::Arc;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;
use crawler::{get_crawlers, CrawledProduct};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct HistoryEntry {
    pub keyword: String,
    pub timestamp: u64,
    pub total_count: usize,
    pub available_count: usize,
    pub products: Vec<CrawledProduct>, // 썸네일용 상위 5개
}

fn history_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("search_history.json")
}

fn load_history_from_file(app: &tauri::AppHandle) -> Vec<HistoryEntry> {
    let path = history_path(app);
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_history_to_file(app: &tauri::AppHandle, entries: &[HistoryEntry]) {
    let path = history_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(entries) {
        let _ = std::fs::write(&path, json);
    }
}

#[tauri::command]
async fn load_history(app: tauri::AppHandle) -> Vec<HistoryEntry> {
    load_history_from_file(&app)
}

#[tauri::command]
async fn search(keyword: String, app: tauri::AppHandle) -> Result<Vec<CrawledProduct>, String> {
    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }
    let crawlers = get_crawlers();
    let kw = Arc::new(keyword.clone());

    let handles: Vec<_> = crawlers
        .into_iter()
        .map(|crawler| {
            let kw = kw.clone();
            tokio::spawn(async move {
                tokio::time::timeout(Duration::from_secs(30), crawler.search(&kw)).await
            })
        })
        .collect();

    let mut all_products: Vec<CrawledProduct> = Vec::new();
    for handle in handles {
        if let Ok(Ok(Ok(products))) = handle.await {
            all_products.extend(products);
        }
    }

    // price ≤ 1 은 품절 더미 가격 → None 으로 정규화
    for p in &mut all_products {
        if p.price.map_or(false, |v| v <= 1) {
            p.is_sold_out = true;
            p.price = None;
        }
    }

    // 검색 이력 저장
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let available_count = all_products.iter().filter(|p| !p.is_sold_out).count();
    let preview: Vec<CrawledProduct> = all_products
        .iter()
        .filter(|p| !p.is_sold_out && !p.images.is_empty())
        .take(6)
        .cloned()
        .collect();

    let entry = HistoryEntry {
        keyword: keyword.trim().to_string(),
        timestamp,
        total_count: all_products.len(),
        available_count,
        products: preview,
    };

    let mut history = load_history_from_file(&app);
    // 같은 키워드(대소문자 무시) 기존 항목 제거 후 맨 앞에 추가
    history.retain(|e| e.keyword.to_lowercase() != entry.keyword.to_lowercase());
    history.insert(0, entry);
    history.truncate(10);
    save_history_to_file(&app, &history);

    Ok(all_products)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search, load_history])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
