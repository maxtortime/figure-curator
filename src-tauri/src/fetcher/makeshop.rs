use std::sync::LazyLock;

use anyhow::Result;
use async_trait::async_trait;
use regex::Regex;
use scraper::Selector;

use super::base::{
    check_sold_out, ensure_http_protocol, extract_price_krw, first_product_image, get_text,
    normalize_url, parse_html, select_one, FetchedProduct, ShopFetcher, HTTP_CLIENT,
};

static BRANDUID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"branduid=(\d+)").unwrap());

static PRICE_ONLY_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[\d,]+원?$").unwrap());

pub struct MakeshopFetcher {
    pub shop_id: u32,
    pub shop_name: String,
    pub base_url: String,
    pub encoding: &'static encoding_rs::Encoding,
}

impl MakeshopFetcher {
    pub fn new(shop_id: u32, shop_name: &str, domain: &str) -> Self {
        Self {
            shop_id,
            shop_name: shop_name.to_string(),
            base_url: ensure_http_protocol(domain),
            encoding: encoding_rs::EUC_KR,
        }
    }

    pub fn with_utf8(mut self) -> Self {
        self.encoding = encoding_rs::UTF_8;
        self
    }

    async fn fetch_search(&self, keyword: &str) -> Result<String> {
        let encoded_bytes = self.encoding.encode(keyword).0;
        let encoded = percent_encoding::percent_encode(&encoded_bytes, percent_encoding::NON_ALPHANUMERIC).to_string();
        let url = format!("{}/shop/shopbrand.html?search={}", self.base_url, encoded);
        let bytes = HTTP_CLIENT
            .get(&url)
            .send()
            .await?
            .bytes()
            .await?;
        Ok(self.encoding.decode(&bytes).0.into_owned())
    }
}

#[async_trait]
impl ShopFetcher for MakeshopFetcher {
    fn shop_id(&self) -> u32 { self.shop_id }
    fn shop_name(&self) -> &str { &self.shop_name }

    async fn search(&self, keyword: &str) -> Result<Vec<FetchedProduct>> {
        let html = self.fetch_search(keyword).await?;
        Ok(parse_page(&html, &self.base_url, self.shop_id, &self.shop_name))
    }
}

pub fn parse_page(html: &str, base: &str, shop_id: u32, shop_name: &str) -> Vec<FetchedProduct> {
    let doc = parse_html(html);
    let mut seen = std::collections::HashSet::new();

    // 신형 MakeShop: li.goodsDisplayWrap
    let wrap_sel = Selector::parse("li.goodsDisplayWrap").unwrap();
    let wraps: Vec<_> = doc.select(&wrap_sel).collect();
    if !wraps.is_empty() {
        let mut products = Vec::new();
        for li in &wraps {
            let link_sel = Selector::parse(r#"a[href*="branduid"]"#).unwrap();
            let link = match li.select(&link_sel).next() {
                Some(l) => l,
                None => continue,
            };
            let href = link.attr("href").unwrap_or("");
            let pid = match BRANDUID_RE.captures(href).map(|c| c[1].to_string()) {
                Some(p) => p,
                None => continue,
            };
            if !seen.insert(pid.clone()) { continue; }

            let name = select_one(li, ".goods_name")
                .map(|n| get_text(&n))
                .or_else(|| {
                    select_one(li, ".goodsDisplayTextWrap").and_then(|wrap| {
                        get_text(&wrap).lines()
                            .map(|l| l.trim().to_string())
                            .find(|l| l.len() >= 4 && !PRICE_ONLY_RE.is_match(l))
                    })
                })
                .unwrap_or_default();
            if name.is_empty() { continue; }

            let text = get_text(li);
            let price = extract_price_krw(&text);
            let image_url = first_product_image(li, base);
            let is_sold_out = check_sold_out(&text, Some(li));

            products.push(FetchedProduct {
                shop_id,
                shop_name: shop_name.to_string(),
                name,
                price,
                is_sold_out,
                source_url: normalize_url(href, base),
                source_product_id: pid,
                jan_code: None,
                images: if image_url.is_empty() { vec![] } else { vec![image_url] },
            });
        }
        return products;
    }

    // 구형 MakeShop: branduid 링크 기반
    let mut products = Vec::new();
    let link_sel = Selector::parse(r#"a[href*="branduid"]"#).unwrap();
    for link in doc.select(&link_sel) {
        if link.select(&Selector::parse("img").unwrap()).next().is_none() {
            continue;
        }
        let href = link.attr("href").unwrap_or("");
        let pid = match BRANDUID_RE.captures(href).map(|c| c[1].to_string()) {
            Some(p) => p,
            None => continue,
        };
        if !seen.insert(pid.clone()) { continue; }

        // 텍스트에서 상품명 추출 (가격/짧은 텍스트 제외)
        let text = get_text(&link);
        let name = text.lines()
            .map(|l| l.trim())
            .find(|l| l.len() >= 4 && !PRICE_ONLY_RE.is_match(l))
            .unwrap_or("")
            .to_string();
        if name.is_empty() { continue; }

        let price = extract_price_krw(&text);
        let img_src = link.select(&Selector::parse("img").unwrap())
            .next()
            .and_then(|img| img.attr("src"))
            .unwrap_or("");
        let image_url = normalize_url(img_src, base);
        let is_sold_out = check_sold_out(&text, Some(&link));

        products.push(FetchedProduct {
            shop_id,
            shop_name: shop_name.to_string(),
            name,
            price,
            is_sold_out,
            source_url: normalize_url(href, base),
            source_product_id: pid,
            jan_code: None,
            images: if image_url.is_empty() { vec![] } else { vec![image_url] },
        });
    }
    products
}
