use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;

use super::base::{CrawledProduct, ShopCrawler};

const SHOP_ID: u32 = 29;
const SHOP_NAME: &str = "아미아미";
const API_BASE: &str = "https://api.amiami.com/api/v1.0/items";

// rquest 클라이언트 (Cloudflare TLS 핑거프린트 위장)
fn build_client() -> rquest::Client {
    rquest::Client::builder()
        .impersonate(rquest::Impersonate::Chrome131)
        .build()
        .unwrap()
}

#[derive(Deserialize)]
struct ApiResponse {
    #[serde(rename = "RSuccess")]
    success: bool,
    items: Option<Vec<ApiItem>>,
}

#[derive(Deserialize)]
struct ApiItem {
    gcode: Option<String>,
    gname: Option<String>,
    min_price: Option<serde_json::Value>,
    c_price_taxed: Option<serde_json::Value>,
    thumb_url: Option<String>,
    thumb_alt: Option<String>,
    main_image_url: Option<String>,
    simg_url: Option<String>,
    jancode: Option<serde_json::Value>,
    order_closed_flg: Option<serde_json::Value>,
}

impl ApiItem {
    fn price(&self) -> Option<i64> {
        let v = self.min_price.as_ref().or(self.c_price_taxed.as_ref())?;
        match v {
            serde_json::Value::Number(n) => n.as_i64(),
            serde_json::Value::String(s) => s.parse().ok(),
            _ => None,
        }
    }

    fn thumb(&self) -> String {
        let raw = self.thumb_url.as_deref()
            .or(self.thumb_alt.as_deref())
            .or(self.main_image_url.as_deref())
            .or(self.simg_url.as_deref())
            .unwrap_or("");
        if raw.is_empty() { return String::new(); }
        if raw.starts_with("http") { raw.to_string() } else { format!("https://img.amiami.com{raw}") }
    }

    fn jan_code(&self) -> Option<String> {
        let v = self.jancode.as_ref()?;
        let s = match v {
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s.clone(),
            _ => return None,
        };
        if s.len() >= 8 { Some(s) } else { None }
    }

    fn is_sold_out(&self) -> bool {
        self.order_closed_flg.as_ref().and_then(|v| v.as_i64()).unwrap_or(0) != 0
    }
}

pub struct AmiAmiCrawler;

#[async_trait]
impl ShopCrawler for AmiAmiCrawler {
    fn shop_id(&self) -> u32 { SHOP_ID }
    fn shop_name(&self) -> &str { SHOP_NAME }

    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>> {
        let client = build_client();
        let resp = client
            .get(API_BASE)
            .header("X-User-Key", "amiami_dev")
            .header("Referer", "https://www.amiami.com/")
            .header("Origin", "https://www.amiami.com")
            .header("Accept", "application/json, text/plain, */*")
            .header("Accept-Language", "en-US,en;q=0.9")
            .query(&[
                ("s_keywords", keyword),
                ("pagemax", "30"),
                ("pagecnt", "1"),
                ("lang", "eng"),
            ])
            .send()
            .await?;

        let data: ApiResponse = resp.json().await?;
        if !data.success {
            return Ok(vec![]);
        }

        let products = data.items.unwrap_or_default()
            .into_iter()
            .filter_map(|item| {
                let gcode = item.gcode.clone().filter(|s| !s.is_empty())?;
                let name = item.gname.clone().filter(|s| !s.is_empty())?;
                let thumb = item.thumb();
                Some(CrawledProduct {
                    shop_id: SHOP_ID,
                    shop_name: SHOP_NAME.to_string(),
                    name,
                    price: item.price(),
                    is_sold_out: item.is_sold_out(),
                    source_url: format!("https://www.amiami.com/eng/detail/?gcode={gcode}"),
                    source_product_id: gcode,
                    jan_code: item.jan_code(),
                    images: if thumb.is_empty() { vec![] } else { vec![thumb] },
                })
            })
            .collect();

        Ok(products)
    }
}
