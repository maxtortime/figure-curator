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

    // price ≤ 1 은 품절 더미 가격 → None 으로 정규화
    for p in &mut all_products {
        if p.price.map_or(false, |v| v <= 1) {
            p.is_sold_out = true;
            p.price = None;
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
