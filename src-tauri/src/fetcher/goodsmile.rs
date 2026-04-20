use anyhow::Result;
use async_trait::async_trait;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use regex::Regex;
use scraper::Selector;
use std::sync::LazyLock;

use super::base::{normalize_url, parse_html, get_text, FetchedProduct, ShopFetcher};

const SHOP_ID: u32 = 28;
const SHOP_NAME: &str = "굿스마일";
const BASE_URL: &str = "https://www.goodsmile.com";

static PRODUCT_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/product/(\d+)").unwrap());

static JPY_PRICE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[￥¥]([\d,]+)").unwrap());

fn fetch_html_via_browser(url: &str) -> Result<String> {
    use headless_chrome::{Browser, LaunchOptions};
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .headless(true)
            .build()
            .expect("failed to build launch options"),
    )?;
    let tab = browser.new_tab()?;
    tab.navigate_to(url)?.wait_until_navigated()?;
    Ok(tab.get_content()?)
}

fn parse_page(html: &str, shop_id: u32, shop_name: &str) -> Vec<FetchedProduct> {
    let doc = parse_html(html);
    let mut products = Vec::new();

    let link_sel = Selector::parse(".p-product-list__link").unwrap();
    for el in doc.select(&link_sel) {
        let href = el.attr("href").unwrap_or("");
        let pid = match PRODUCT_ID_RE.captures(href).map(|c| c[1].to_string()) {
            Some(p) => p,
            None => continue,
        };

        let source_url = if href.starts_with('/') {
            format!("{BASE_URL}{href}")
        } else {
            href.to_string()
        };

        let name_sel = Selector::parse("h2").unwrap();
        let name = match el.select(&name_sel).next().map(|n| get_text(&n)) {
            Some(n) if !n.is_empty() => n,
            _ => continue,
        };

        let price = Selector::parse(".c-price__main").ok()
            .and_then(|s| el.select(&s).next())
            .and_then(|p| {
                let text = get_text(&p);
                JPY_PRICE_RE.captures(&text)
                    .and_then(|cap| cap[1].replace(',', "").parse::<i64>().ok())
            });

        let img_src = Selector::parse(".b-product-item__image img").ok()
            .and_then(|s| el.select(&s).next())
            .map(|img| {
                for attr in &["src", "data-src", "data-original"] {
                    if let Some(val) = img.attr(attr) {
                        if val.len() > 10 {
                            return if val.starts_with("http") {
                                val.to_string()
                            } else {
                                format!("{BASE_URL}{val}")
                            };
                        }
                    }
                }
                // srcset 폴백
                img.attr("srcset").map(|ss| {
                    ss.split(',').next()
                        .and_then(|s| s.trim().split_whitespace().next())
                        .map(|s| normalize_url(s, BASE_URL))
                        .unwrap_or_default()
                }).unwrap_or_default()
            })
            .unwrap_or_default();

        let is_sold_out = get_text(&el).to_lowercase().contains("sold out");

        products.push(FetchedProduct {
            shop_id,
            shop_name: shop_name.to_string(),
            name,
            price,
            is_sold_out,
            source_url,
            source_product_id: pid,
            jan_code: None,
            images: if img_src.is_empty() { vec![] } else { vec![img_src] },
        });
    }
    products
}

pub struct GoodsmileFetcher;

#[async_trait]
impl ShopFetcher for GoodsmileFetcher {
    fn shop_id(&self) -> u32 { SHOP_ID }
    fn shop_name(&self) -> &str { SHOP_NAME }

    async fn search(&self, keyword: &str) -> Result<Vec<FetchedProduct>> {
        let encoded = utf8_percent_encode(keyword, NON_ALPHANUMERIC).to_string();
        let url = format!("{BASE_URL}/en/search?search_keyword={encoded}");
        let html = tokio::task::spawn_blocking(move || fetch_html_via_browser(&url)).await??;
        Ok(parse_page(&html, SHOP_ID, SHOP_NAME))
    }
}
