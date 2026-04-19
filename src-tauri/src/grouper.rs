use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::crawler::CrawledProduct;

// ── Stop tokens ───────────────────────────────────────────

static STOP_TOKENS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "피규어", "프라모델", "완성품", "정품", "국내정품", "당일발송", "빠른배송",
        "예약", "입고", "한정", "수입", "특가", "할인", "세일", "이벤트",
        "figure", "model", "kit", "pvc", "abs", "plastic", "ver", "version",
        "일제", "일본정품", "공식", "한국정품", "미개봉", "새상품", "입고완료",
    ].iter().copied().collect()
});

// ── Regex ─────────────────────────────────────────────────

static BRACKET_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[（）【】「」『』()]").unwrap()
});
static PUNCT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[.,、·\-/\[\]]").unwrap()
});
static BRAND_PAREN_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\(([A-Za-z][A-Za-z\s\-]{1,20})\)").unwrap()
});
static BRAND_KOREAN_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([가-힣]+)").unwrap()
});
static PROD_NO_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:no\.?\s*|#\s*)(\d{3,5})\b").unwrap()
});
static NENDO_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:넨도로이드|nendoroid|네도로이드)\s+(\d{3,5})\b").unwrap()
});
static FIGMA_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:피그마|figma)\s+(\d{3,5})\b").unwrap()
});

// ── Tokenizer ─────────────────────────────────────────────

fn tokenize(name: &str) -> Vec<String> {
    if name.is_empty() { return vec![]; }
    let s = name.to_lowercase();
    let s = BRACKET_RE.replace_all(&s, " ");
    let s = PUNCT_RE.replace_all(&s, " ");
    s.split_whitespace()
        .filter(|t| t.chars().count() > 1 && !STOP_TOKENS.contains(*t))
        .map(|t| t.to_string())
        .collect()
}

fn extract_brand_key(name: &str) -> String {
    if name.is_empty() { return String::new(); }
    if let Some(cap) = BRAND_PAREN_RE.captures(name) {
        return cap[1].to_lowercase().split_whitespace().collect::<String>();
    }
    if let Some(cap) = BRAND_KOREAN_RE.captures(name) {
        return cap[1].to_string();
    }
    tokenize(name).into_iter().next().unwrap_or_default()
}

fn extract_product_number(name: &str) -> Option<String> {
    if name.is_empty() { return None; }
    // 넨도로이드 / figma 번호 우선 (더 구체적)
    if let Some(cap) = NENDO_RE.captures(name) { return Some(cap[1].to_string()); }
    if let Some(cap) = FIGMA_RE.captures(name) { return Some(cap[1].to_string()); }
    if let Some(cap) = PROD_NO_RE.captures(name) { return Some(cap[1].to_string()); }
    None
}

// ── TF-IDF ────────────────────────────────────────────────

fn tfidf_vectors(token_lists: &[Vec<String>]) -> Vec<HashMap<String, f64>> {
    let n = token_lists.len();
    if n == 0 { return vec![]; }

    let mut df: HashMap<String, usize> = HashMap::new();
    for tokens in token_lists {
        let unique: HashSet<_> = tokens.iter().collect();
        for t in unique { *df.entry(t.clone()).or_insert(0) += 1; }
    }

    let idf: HashMap<String, f64> = df.iter()
        .map(|(t, &cnt)| (t.clone(), ((n + 1) as f64 / (cnt + 1) as f64).ln()))
        .collect();

    token_lists.iter().map(|tokens| {
        let mut tf: HashMap<String, usize> = HashMap::new();
        for t in tokens { *tf.entry(t.clone()).or_insert(0) += 1; }
        let total = tf.values().sum::<usize>().max(1) as f64;
        tf.iter()
            .filter_map(|(t, &cnt)| idf.get(t).map(|&iv| (t.clone(), (cnt as f64 / total) * iv)))
            .collect()
    }).collect()
}

fn cosine(v1: &HashMap<String, f64>, v2: &HashMap<String, f64>) -> f64 {
    let dot: f64 = v1.iter()
        .filter_map(|(t, &w)| v2.get(t).map(|&w2| w * w2))
        .sum();
    let m1 = v1.values().map(|&x| x * x).sum::<f64>().sqrt();
    let m2 = v2.values().map(|&x| x * x).sum::<f64>().sqrt();
    if m1 > 0.0 && m2 > 0.0 { dot / (m1 * m2) } else { 0.0 }
}

// ── 결과 타입 ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum GroupKey {
    Jan(String),
    ProductNumber(String),
    Similarity(f64),
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductGroup {
    pub key: GroupKey,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub items: Vec<CrawledProduct>,
}

impl ProductGroup {
    /// 대표 이미지: 이미지가 있는 첫 번째 상품
    pub fn representative(&self) -> &CrawledProduct {
        self.items.iter().find(|p| !p.images.is_empty()).unwrap_or(&self.items[0])
    }

    /// 재고 있는 최저가
    pub fn min_price(&self) -> Option<i64> {
        self.items.iter()
            .filter(|p| !p.is_sold_out)
            .filter_map(|p| p.price)
            .min()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupResult {
    pub groups: Vec<ProductGroup>,
    pub ungrouped: Vec<CrawledProduct>,
}

// ── 메인 알고리즘 ─────────────────────────────────────────

pub const DEFAULT_THRESHOLD: f64 = 0.42;

pub fn auto_group(products: Vec<CrawledProduct>, threshold: f64) -> GroupResult {
    let n = products.len();
    let mut used = vec![false; n];
    let mut groups: Vec<ProductGroup> = Vec::new();

    // ── Pass 1: JAN exact match ───────────────────────────
    let mut by_jan: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, p) in products.iter().enumerate() {
        if let Some(jan) = &p.jan_code {
            if !jan.is_empty() {
                by_jan.entry(jan.clone()).or_default().push(i);
            }
        }
    }
    for (jan, idxs) in &by_jan {
        let avail: Vec<usize> = idxs.iter().copied().filter(|&i| !used[i]).collect();
        if avail.len() < 2 { continue; }
        let items = avail.iter().map(|&i| products[i].clone()).collect();
        groups.push(ProductGroup { key: GroupKey::Jan(jan.clone()), label: None, items });
        for i in avail { used[i] = true; }
    }

    // ── Pass 2: 상품 번호 (크로스-샵만) ──────────────────
    let mut by_num: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, p) in products.iter().enumerate() {
        if used[i] { continue; }
        if let Some(num) = extract_product_number(&p.name) {
            by_num.entry(num).or_default().push(i);
        }
    }
    for (num, idxs) in &by_num {
        let avail: Vec<usize> = idxs.iter().copied().filter(|&i| !used[i]).collect();
        if avail.len() < 2 { continue; }
        let shop_ids: HashSet<u32> = avail.iter().map(|&i| products[i].shop_id).collect();
        if shop_ids.len() < 2 { continue; } // 같은 샵끼리만 있으면 스킵
        let items = avail.iter().map(|&i| products[i].clone()).collect();
        groups.push(ProductGroup { key: GroupKey::ProductNumber(num.clone()), label: None, items });
        for i in avail { used[i] = true; }
    }

    // ── Pass 3: TF-IDF cosine (브랜드 버킷별) ────────────
    let mut buckets: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, p) in products.iter().enumerate() {
        if used[i] { continue; }
        let key = {
            let k = extract_brand_key(&p.name);
            if k.is_empty() { "__unknown__".to_string() } else { k }
        };
        buckets.entry(key).or_default().push(i);
    }

    for bucket_idxs in buckets.values() {
        if bucket_idxs.len() < 2 { continue; }

        let token_lists: Vec<Vec<String>> = bucket_idxs.iter()
            .map(|&i| tokenize(&products[i].name))
            .collect();
        let vecs = tfidf_vectors(&token_lists);

        let local_n = bucket_idxs.len();
        let mut local_used = vec![false; local_n];

        for i in 0..local_n {
            if local_used[i] { continue; }
            let mut cluster = vec![i];
            local_used[i] = true;

            for j in (i + 1)..local_n {
                if local_used[j] { continue; }
                if products[bucket_idxs[i]].shop_id == products[bucket_idxs[j]].shop_id { continue; }
                if cosine(&vecs[i], &vecs[j]) >= threshold {
                    cluster.push(j);
                    local_used[j] = true;
                }
            }

            if cluster.len() < 2 { continue; }

            let score = if cluster.len() >= 2 {
                cosine(&vecs[cluster[0]], &vecs[cluster[1]])
            } else { 0.0 };
            let items = cluster.iter().map(|&li| products[bucket_idxs[li]].clone()).collect();
            groups.push(ProductGroup { key: GroupKey::Similarity(score), label: None, items });
            for li in &cluster { used[bucket_idxs[*li]] = true; }
        }
    }

    let ungrouped = products.into_iter().enumerate()
        .filter(|(i, _)| !used[*i])
        .map(|(_, p)| p)
        .collect();

    GroupResult { groups, ungrouped }
}

// ── 테스트 ────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn mock(shop_id: u32, name: &str, jan: Option<&str>) -> CrawledProduct {
        CrawledProduct {
            shop_id,
            shop_name: format!("shop{shop_id}"),
            name: name.to_string(),
            price: Some(10000),
            is_sold_out: false,
            source_url: String::new(),
            source_product_id: String::new(),
            jan_code: jan.map(|s| s.to_string()),
            images: vec![],
        }
    }

    #[test]
    fn test_jan_grouping() {
        let items = vec![
            mock(1, "넨도로이드 프리렌", Some("4580590175174")),
            mock(2, "넨도로이드 프리렌 피규어", Some("4580590175174")),
            mock(3, "건담 RX-78", None),
        ];
        let result = auto_group(items, DEFAULT_THRESHOLD);
        assert_eq!(result.groups.len(), 1);
        assert!(matches!(result.groups[0].key, GroupKey::Jan(_)));
        assert_eq!(result.ungrouped.len(), 1);
    }

    #[test]
    fn test_nendo_number_grouping() {
        let items = vec![
            mock(1, "넨도로이드 2069 프리렌", None),
            mock(2, "Nendoroid 2069 Frieren", None),
            mock(3, "무관한 상품", None),
        ];
        let result = auto_group(items, DEFAULT_THRESHOLD);
        assert_eq!(result.groups.len(), 1);
        assert!(matches!(result.groups[0].key, GroupKey::ProductNumber(_)));
    }

    #[test]
    fn test_tokenize_stop_words() {
        let tokens = tokenize("넨도로이드 프리렌 국내정품 당일발송 피규어");
        assert!(!tokens.contains(&"국내정품".to_string()));
        assert!(!tokens.contains(&"피규어".to_string()));
        assert!(tokens.contains(&"넨도로이드".to_string()));
    }
}
