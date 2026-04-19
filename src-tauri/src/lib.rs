pub mod crawler;

use std::sync::Arc;
use std::time::Duration;

use crawler::{get_crawlers, CrawledProduct};

#[tauri::command]
async fn search(keyword: String) -> Result<Vec<CrawledProduct>, String> {
    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }
    let crawlers = get_crawlers();
    let kw = Arc::new(keyword);

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
    Ok(all_products)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
