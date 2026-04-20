use anyhow::Result;
use async_trait::async_trait;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use scraper::Selector;

use super::base::{parse_html, FetchedProduct, ShopFetcher};
use super::cafe24::parse_page;

const SHOP_ID: u32 = 15;
const SHOP_NAME: &str = "히어로타임";
const BASE_URL: &str = "https://herotime.co.kr";

fn fetch_rendered_html(url: &str) -> Result<String> {
    use headless_chrome::{Browser, LaunchOptions};
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .headless(true)
            .build()
            .expect("failed to build launch options"),
    )?;
    let tab = browser.new_tab()?;
    tab.navigate_to(url)?.wait_until_navigated()?;
    // ul.prdList li 가 DOM에 나타날 때까지 대기 (JS 렌더 완료 보장)
    let _ = tab.wait_for_element("ul.prdList li");
    Ok(tab.get_content()?)
}

// 렌더된 HTML에서 div.promotion_soldout > img 가 있는 li의 product_id 수집
fn extract_soldout_ids(html: &str) -> std::collections::HashSet<String> {
    let doc = parse_html(html);
    let li_sel = Selector::parse("ul.prdList li").unwrap();
    let promo_img_sel = Selector::parse("div.promotion_soldout img").unwrap();
    let link_sel = Selector::parse(r#"a[href*="product_no"], a[href*="/product/"]"#).unwrap();

    let mut ids = std::collections::HashSet::new();
    for li in doc.select(&li_sel) {
        if li.select(&promo_img_sel).next().is_none() {
            continue;
        }
        if let Some(link) = li.select(&link_sel).next() {
            let href = link.attr("href").unwrap_or("");
            if let Some(id) = super::cafe24::extract_pid_pub(href) {
                ids.insert(id);
            }
        }
    }
    ids
}

pub struct HerotimeFetcher;

#[async_trait]
impl ShopFetcher for HerotimeFetcher {
    fn shop_id(&self) -> u32 { SHOP_ID }
    fn shop_name(&self) -> &str { SHOP_NAME }

    async fn search(&self, keyword: &str) -> Result<Vec<FetchedProduct>> {
        let encoded = utf8_percent_encode(keyword, NON_ALPHANUMERIC).to_string();
        let url = format!("{BASE_URL}/product/search.html?keyword={encoded}");

        let html = tokio::task::spawn_blocking(move || fetch_rendered_html(&url)).await??;

        let soldout_set = extract_soldout_ids(&html);
        let mut products = parse_page(&html, BASE_URL, SHOP_ID, SHOP_NAME);

        for product in &mut products {
            if soldout_set.contains(&product.source_product_id) {
                product.is_sold_out = true;
            }
        }
        Ok(products)
    }
}
