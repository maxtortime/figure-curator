use std::sync::LazyLock;

use anyhow::Result;
use async_trait::async_trait;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use regex::Regex;
use scraper::Selector;

use super::base::{
    check_sold_out, ensure_http_protocol, extract_price_krw, first_product_image, get_text,
    normalize_url, parse_html, CrawledProduct, ShopCrawler, HTTP_CLIENT, TIMEOUT_SECS,
};

static GOODS_NO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"goodsNo=(\d+)").unwrap());

pub struct GodoCrawler {
    pub shop_id: u32,
    pub shop_name: String,
    pub base_url: String,
}

impl GodoCrawler {
    pub fn new(shop_id: u32, shop_name: &str, domain: &str) -> Self {
        Self {
            shop_id,
            shop_name: shop_name.to_string(),
            base_url: ensure_http_protocol(domain),
        }
    }
}

#[async_trait]
impl ShopCrawler for GodoCrawler {
    fn shop_id(&self) -> u32 { self.shop_id }
    fn shop_name(&self) -> &str { &self.shop_name }

    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>> {
        let encoded = utf8_percent_encode(keyword, NON_ALPHANUMERIC).to_string();
        let url = format!("{}/goods/goods_search.php?keyword={}", self.base_url, encoded);
        let html = HTTP_CLIENT
            .get(&url)
            .timeout(std::time::Duration::from_secs(TIMEOUT_SECS))
            .send()
            .await?
            .text()
            .await?;
        Ok(parse_page(&html, &self.base_url, self.shop_id, &self.shop_name))
    }
}

fn parse_page(html: &str, base: &str, shop_id: u32, shop_name: &str) -> Vec<CrawledProduct> {
    let doc = parse_html(html);
    let mut products = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let list_sel = match Selector::parse(".goods_list") {
        Ok(s) => s,
        Err(_) => return products,
    };
    let goods_list = match doc.select(&list_sel).next() {
        Some(el) => el,
        None => return products,
    };

    let li_sel = Selector::parse("li").unwrap();
    for li in goods_list.select(&li_sel) {
        let link_sel = Selector::parse(r#"a[href*="goodsNo"]"#).unwrap();
        let link = match li.select(&link_sel).next() {
            Some(l) => l,
            None => continue,
        };
        let href = link.attr("href").unwrap_or("");
        let gid = match GOODS_NO_RE.captures(href).map(|c| c[1].to_string()) {
            Some(g) => g,
            None => continue,
        };
        if !seen.insert(gid.clone()) { continue; }

        let name = {
            let from_el = Selector::parse(".item_name").ok()
                .and_then(|s| li.select(&s).next())
                .map(|n| get_text(&n));
            let from_img = || {
                Selector::parse("img").ok()
                    .and_then(|s| li.select(&s).next())
                    .and_then(|img| img.attr("alt"))
                    .map(|a| a.trim().to_string())
            };
            from_el.filter(|n| !n.is_empty()).unwrap_or_else(|| from_img().unwrap_or_default())
        };
        if name.is_empty() || name.to_uppercase() == "SOLD OUT" { continue; }

        let text = get_text(&li);
        let price = extract_price_krw(&text);
        let image_url = first_product_image(&li, base);
        let is_sold_out = check_sold_out(&text, Some(&li));

        let source_url = if href.starts_with("http") {
            href.to_string()
        } else {
            format!("{}/{}", base, href.trim_start_matches("../"))
        };

        products.push(CrawledProduct {
            shop_id,
            shop_name: shop_name.to_string(),
            name,
            price,
            is_sold_out,
            source_url,
            source_product_id: gid,
            jan_code: None,
            images: if image_url.is_empty() { vec![] } else { vec![image_url] },
        });
    }
    products
}
