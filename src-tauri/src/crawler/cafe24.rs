use std::sync::LazyLock;

use anyhow::Result;
use async_trait::async_trait;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use regex::Regex;
use scraper::Selector;

use super::base::{
    check_sold_out, ensure_http_protocol, extract_price_krw, first_product_image, get_text,
    normalize_url, parse_html, select_one, CrawledProduct, ShopCrawler, HTTP_CLIENT,
};

static NAME_LABEL_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^(상품명|상품 명)\s*:?\s*").unwrap());

static PRODUCT_NO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"product_no=(\d+)").unwrap());

static PRODUCT_PATH_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/product/[^/]+/(\d+)").unwrap());

fn clean_name(raw: &str) -> String {
    let cleaned = NAME_LABEL_RE.replace_all(raw, "");
    cleaned
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .last()
        .unwrap_or("")
        .to_string()
}

fn extract_pid(href: &str) -> Option<String> {
    PRODUCT_NO_RE
        .captures(href)
        .or_else(|| PRODUCT_PATH_RE.captures(href))
        .map(|cap| cap[1].to_string())
}

pub fn extract_pid_pub(href: &str) -> Option<String> {
    extract_pid(href)
}

// ── 팩토리 구조체 ─────────────────────────────────────────

pub enum FetchMethod {
    Get,
    Post,
}

pub struct Cafe24Crawler {
    pub shop_id: u32,
    pub shop_name: String,
    pub base_url: String,
    pub method: FetchMethod,
    pub encoding: Option<&'static encoding_rs::Encoding>,
}

impl Cafe24Crawler {
    pub fn new(shop_id: u32, shop_name: &str, domain: &str) -> Self {
        Self {
            shop_id,
            shop_name: shop_name.to_string(),
            base_url: ensure_http_protocol(domain),
            method: FetchMethod::Get,
            encoding: None,
        }
    }

    pub fn with_post(mut self) -> Self {
        self.method = FetchMethod::Post;
        self
    }

    pub fn with_encoding(mut self, enc: &'static encoding_rs::Encoding) -> Self {
        self.encoding = Some(enc);
        self
    }

    async fn fetch_search(&self, keyword: &str) -> Result<String> {
        let base = &self.base_url;
        let bytes = match self.method {
            FetchMethod::Get => {
                let encoded = utf8_percent_encode(keyword, NON_ALPHANUMERIC).to_string();
                let url = format!("{base}/product/search.html?keyword={encoded}");
                HTTP_CLIENT
                    .get(&url)
                    .send()
                    .await?
                    .bytes()
                    .await?
            }
            FetchMethod::Post => {
                // POST: 먼저 GET으로 쿠키 취득 후 POST
                let _ = HTTP_CLIENT.get(base).send().await;
                HTTP_CLIENT
                    .post(format!("{base}/product/search.html"))
                    .form(&[("search", keyword)])
                    .send()
                    .await?
                    .bytes()
                    .await?
            }
        };
        Ok(self.decode_bytes(&bytes))
    }

    fn decode_bytes(&self, bytes: &[u8]) -> String {
        match self.encoding {
            Some(enc) => enc.decode(bytes).0.into_owned(),
            None => String::from_utf8_lossy(bytes).into_owned(),
        }
    }
}

#[async_trait]
impl ShopCrawler for Cafe24Crawler {
    fn shop_id(&self) -> u32 { self.shop_id }
    fn shop_name(&self) -> &str { &self.shop_name }

    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>> {
        let html = self.fetch_search(keyword).await?;
        Ok(parse_page(&html, &self.base_url, self.shop_id, &self.shop_name))
    }

    async fn search_page(&self, keyword: &str, page: u32) -> Result<Vec<CrawledProduct>> {
        // POST 방식은 페이지네이션 미지원
        if matches!(self.method, FetchMethod::Post) {
            return if page == 1 { self.search(keyword).await } else { Ok(vec![]) };
        }
        let encoded = percent_encoding::utf8_percent_encode(keyword, percent_encoding::NON_ALPHANUMERIC).to_string();
        let url = format!("{}/product/search.html?keyword={}&page={}", self.base_url, encoded, page);
        let bytes = HTTP_CLIENT.get(&url).send().await?.bytes().await?;
        let html = self.decode_bytes(&bytes);
        Ok(parse_page(&html, &self.base_url, self.shop_id, &self.shop_name))
    }
}

// ── HTML 파싱 ─────────────────────────────────────────────

pub fn parse_page(html: &str, base: &str, shop_id: u32, shop_name: &str) -> Vec<CrawledProduct> {
    let doc = parse_html(html);

    let dl_sel = Selector::parse("dl.rightPad").unwrap();
    let dls: Vec<_> = doc.select(&dl_sel).collect();
    if !dls.is_empty() {
        return parse_dl_items(&dls, base, shop_id, shop_name);
    }

    let li_sel_str = [
        "ul.prdList li",
        ".xans-product-searchresult li",
        "[class*='product_listwrap'] li",
    ];
    for css in &li_sel_str {
        if let Ok(sel) = Selector::parse(css) {
            let items: Vec<_> = doc.select(&sel).collect();
            if !items.is_empty() {
                return parse_li_items(&items, base, shop_id, shop_name);
            }
        }
    }

    // fallback: 모든 li
    let li_sel = Selector::parse("li").unwrap();
    let items: Vec<_> = doc.select(&li_sel).collect();
    parse_li_items(&items, base, shop_id, shop_name)
}

fn parse_li_items(
    items: &[scraper::ElementRef],
    base: &str,
    shop_id: u32,
    shop_name: &str,
) -> Vec<CrawledProduct> {
    let mut products = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for el in items {
        let link_sel = Selector::parse(r#"a[href*="product_no"], a[href*="/product/"]"#).unwrap();
        let link = match el.select(&link_sel).next() {
            Some(l) => l,
            None => continue,
        };
        let href = link.attr("href").unwrap_or("");
        let pid = match extract_pid(href) {
            Some(p) => p,
            None => continue,
        };
        if !seen.insert(pid.clone()) {
            continue;
        }

        let name_raw = select_one(el, ".name a")
            .or_else(|| select_one(el, ".name span"))
            .or_else(|| select_one(el, ".name"))
            .map(|n| get_text(&n))
            .unwrap_or_default();
        let name = clean_name(&name_raw);
        if name.len() < 2 {
            continue;
        }

        let price_text = select_one(el, ".pcDiscountPrice, .sale_price")
            .or_else(|| select_one(el, r#"[id*="product_price_text"]"#))
            .or_else(|| select_one(el, ".price2"))
            .or_else(|| select_one(el, ".price span"))
            .or_else(|| select_one(el, ".price"))
            .map(|p| get_text(&p))
            .unwrap_or_else(|| get_text(el));
        let price = extract_price_krw(&price_text);

        let image_url = first_product_image(el, base);
        let is_sold_out = {
            let mut sold = check_sold_out(&get_text(el), Some(el));
            if !sold {
                if let Some(p) = price {
                    if p <= 1 {
                        sold = true;
                    }
                }
            }
            sold
        };

        products.push(CrawledProduct {
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

fn parse_dl_items(
    dls: &[scraper::ElementRef],
    base: &str,
    shop_id: u32,
    shop_name: &str,
) -> Vec<CrawledProduct> {
    let mut products = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for dl in dls {
        let link_sel = Selector::parse(r#"a[href*="product_no"]"#).unwrap();
        let link = match dl.select(&link_sel).next() {
            Some(l) => l,
            None => continue,
        };
        let href = link.attr("href").unwrap_or("");
        let pid = match PRODUCT_NO_RE.captures(href).map(|c| c[1].to_string()) {
            Some(p) => p,
            None => continue,
        };
        if !seen.insert(pid.clone()) {
            continue;
        }

        let name = dl.attr("title").map(|t| t.trim().to_string()).filter(|t| !t.is_empty())
            .or_else(|| select_one(dl, ".name a").map(|n| get_text(&n)))
            .or_else(|| select_one(dl, ".name").map(|n| get_text(&n)))
            .unwrap_or_default();
        if name.len() < 2 {
            continue;
        }

        let text = get_text(dl);
        let price = extract_price_krw(&text);

        let mut product_img = String::new();
        let mut is_sold_out = false;
        let img_sel = Selector::parse("img").unwrap();
        for img in dl.select(&img_sel) {
            let src = img.attr("src").unwrap_or("");
            let src_lower = src.to_lowercase();
            if src_lower.contains("soldout") || src_lower.contains("sold_out") {
                is_sold_out = true;
                continue;
            }
            if src.contains("button/") || src.contains("icon") || src.contains("btn_")
                || src.contains("/img/") || src.contains("reser")
            {
                continue;
            }
            if product_img.is_empty() && src.len() > 10 {
                product_img = src.to_string();
            }
        }
        if !is_sold_out {
            is_sold_out = check_sold_out(&text, None);
        }

        products.push(CrawledProduct {
            shop_id,
            shop_name: shop_name.to_string(),
            name,
            price,
            is_sold_out,
            source_url: normalize_url(href, base),
            source_product_id: pid,
            jan_code: None,
            images: if product_img.is_empty() {
                vec![]
            } else {
                vec![normalize_url(&product_img, base)]
            },
        });
    }
    products
}
