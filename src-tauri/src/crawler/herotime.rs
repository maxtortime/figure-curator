use anyhow::Result;
use async_trait::async_trait;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

use super::base::CrawledProduct;
use super::base::ShopCrawler;
use super::cafe24::parse_page;

const SHOP_ID: u32 = 15;
const SHOP_NAME: &str = "히어로타임";
const BASE_URL: &str = "https://herotime.co.kr";

const SOLDOUT_JS: &str = r#"
(function() {
    const CLASS_SELS = [
        '.promotion_soldout',
        '.icon_soldout',
        '.btn_soldout',
        '[class*="soldout"]',
        '[class*="sold_out"]',
        '[class*="soldOut"]',
        '[class*="SoldOut"]',
        '[class*="SOLDOUT"]',
    ];
    const SOLDOUT_TEXTS = ['품절', 'SOLD OUT', 'SOLDOUT', '구매불가', '구매 불가'];
    function isVisible(el) {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    }
    function isSoldOut(item) {
        // 클래스 기반 (li 자체 + 자식)
        for (const sel of CLASS_SELS) {
            if (item.matches(sel) && isVisible(item)) return true;
            const el = item.querySelector(sel);
            if (el && isVisible(el)) return true;
        }
        // 텍스트 기반: 가시적 텍스트에 품절 키워드 포함
        const allEls = [item, ...item.querySelectorAll('*')];
        for (const el of allEls) {
            if (!isVisible(el)) continue;
            const text = (el.textContent || '').trim();
            if (SOLDOUT_TEXTS.some(t => text === t)) return true;
        }
        // img alt/src 기반
        for (const img of item.querySelectorAll('img')) {
            const alt = (img.alt || '').toLowerCase();
            const src = (img.src || '').toLowerCase();
            if (alt === '품절' || src.includes('soldout') || src.includes('sold_out')) return true;
        }
        return false;
    }
    const items = document.querySelectorAll('ul.prdList li');
    const sold = [];
    items.forEach(item => {
        if (!isSoldOut(item)) return;
        const link = item.querySelector('a[href*="product_no"]') || item.querySelector('a[href*="/product/"]');
        if (link) {
            const m = link.href.match(/product_no=(\d+)/) || link.href.match(/\/product\/[^\/]+\/(\d+)/);
            if (m) sold.push(m[1]);
        }
    });
    return JSON.stringify(sold);
})()
"#;

fn fetch_with_soldout(url: &str) -> Result<(String, Vec<String>)> {
    use headless_chrome::{Browser, LaunchOptions};
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .headless(true)
            .build()
            .expect("failed to build launch options"),
    )?;
    let tab = browser.new_tab()?;
    tab.navigate_to(url)?.wait_until_navigated()?;

    let soldout_ids: Vec<String> = tab
        .evaluate(SOLDOUT_JS, false)
        .ok()
        .and_then(|rv| rv.value)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let html = tab.get_content()?;
    Ok((html, soldout_ids))
}

pub struct HerotimeCrawler;

#[async_trait]
impl ShopCrawler for HerotimeCrawler {
    fn shop_id(&self) -> u32 { SHOP_ID }
    fn shop_name(&self) -> &str { SHOP_NAME }

    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>> {
        let encoded = utf8_percent_encode(keyword, NON_ALPHANUMERIC).to_string();
        let url = format!("{BASE_URL}/product/search.html?keyword={encoded}");

        let (html, soldout_ids) =
            tokio::task::spawn_blocking(move || fetch_with_soldout(&url)).await??;

        let soldout_set: std::collections::HashSet<String> = soldout_ids.into_iter().collect();
        let mut products = parse_page(&html, BASE_URL, SHOP_ID, SHOP_NAME);

        for product in &mut products {
            if soldout_set.contains(&product.source_product_id) {
                product.is_sold_out = true;
            }
        }
        Ok(products)
    }
}
