use std::sync::LazyLock;
use std::time::Duration;

use anyhow::Result;
use async_trait::async_trait;
use regex::Regex;
use reqwest::header::{self, HeaderMap, HeaderValue};
use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};

// ── 공통 상수 ────────────────────────────────────────────

pub const TIMEOUT_SECS: u64 = 15;

static DEFAULT_HEADERS: LazyLock<HeaderMap> = LazyLock::new(|| {
    let mut map = HeaderMap::new();
    map.insert(
        header::USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
             AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ),
    );
    map.insert(
        header::ACCEPT,
        HeaderValue::from_static(
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ),
    );
    map.insert(
        header::ACCEPT_LANGUAGE,
        HeaderValue::from_static("ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"),
    );
    map
});

pub static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .default_headers(DEFAULT_HEADERS.clone())
        .gzip(true)
        .brotli(true)
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .cookie_store(true)
        .build()
        .unwrap()
});

// ── 크롤링 결과 타입 ──────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawledProduct {
    pub shop_id: u32,
    pub shop_name: String,
    pub name: String,
    pub price: Option<i64>,
    pub is_sold_out: bool,
    pub source_url: String,
    pub source_product_id: String,
    pub jan_code: Option<String>,
    pub images: Vec<String>,
}

// ── ShopCrawler 트레이트 ──────────────────────────────────

#[async_trait]
pub trait ShopCrawler: Send + Sync {
    fn shop_id(&self) -> u32;
    fn shop_name(&self) -> &str;
    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>>;
}

// ── HTML 파싱 ─────────────────────────────────────────────

pub fn parse_html(html: &str) -> Html {
    Html::parse_document(html)
}

pub fn get_text(el: &ElementRef) -> String {
    el.text()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn select_one<'a>(el: &ElementRef<'a>, css: &str) -> Option<ElementRef<'a>> {
    Selector::parse(css).ok().and_then(|sel| el.select(&sel).next())
}

pub fn select_one_doc<'a>(doc: &'a Html, css: &str) -> Option<ElementRef<'a>> {
    Selector::parse(css).ok().and_then(|sel| doc.select(&sel).next())
}

// ── 가격 추출 ─────────────────────────────────────────────

static PRICE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([\d,]+)\s*원").unwrap());

pub fn extract_price_krw(text: &str) -> Option<i64> {
    PRICE_RE
        .captures_iter(text)
        .last()
        .and_then(|cap| cap[1].replace(',', "").parse::<i64>().ok())
}

// ── URL ───────────────────────────────────────────────────

pub fn ensure_http_protocol(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else if url.starts_with("//") {
        format!("https:{url}")
    } else {
        format!("https://{url}")
    }
}

pub fn normalize_url(src: &str, origin: &str) -> String {
    if src.is_empty() {
        return String::new();
    }
    if src.starts_with("//") {
        return format!("https:{src}");
    }
    if src.starts_with("http") {
        return src.to_string();
    }
    if src.starts_with('/') {
        format!("{origin}{src}")
    } else {
        format!("{origin}/{src}")
    }
}

// ── 이미지 ────────────────────────────────────────────────

static ICON_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)btn|icon|button|soldout|sold_out|reser").unwrap());

static PLACEHOLDER_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)blank\.|placeholder|spacer|1x1|no_img|thumb_ready|loading\.").unwrap()
});

const LAZY_ATTRS: &[&str] = &[
    "data-original",
    "data-src",
    "ec-data-src",
    "data-lazy-src",
    "orig",
    "src",
];

pub fn first_product_image(el: &ElementRef, origin: &str) -> String {
    let img_sel = Selector::parse("img").unwrap();
    for img in el.select(&img_sel) {
        let mut src = String::new();
        for &attr in LAZY_ATTRS {
            if let Some(val) = img.attr(attr) {
                if val.len() > 10 && !PLACEHOLDER_RE.is_match(val) {
                    src = val.to_string();
                    break;
                }
            }
        }
        if src.is_empty() {
            src = img.attr("src").unwrap_or("").to_string();
        }
        if src.len() <= 10 {
            continue;
        }
        if ICON_RE.is_match(&src) || PLACEHOLDER_RE.is_match(&src) {
            continue;
        }
        return normalize_url(&src, origin);
    }
    String::new()
}

// ── 품절 감지 ─────────────────────────────────────────────

pub fn check_sold_out(text: &str, el: Option<&ElementRef>) -> bool {
    if let Some(el) = el {
        let img_sel = Selector::parse("img").unwrap();
        for img in el.select(&img_sel) {
            let src = img.attr("src").unwrap_or("").to_lowercase();
            if src.contains("soldout") || src.contains("sold_out") {
                return true;
            }
            let alt = img.attr("alt").unwrap_or("");
            if alt == "품절" {
                return true;
            }
        }
    }
    text.contains("품절") || text.contains("SOLD OUT") || text.contains("구매 불가")
}
