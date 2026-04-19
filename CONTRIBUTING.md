# Contributing to Figure Curator

오픈소스 기여를 환영합니다! 버그 수정, 새 쇼핑몰 크롤러 추가, UI 개선 등 어떤 형태의 기여도 좋습니다.

---

## 개발 환경 설정

[README.md](README.md)의 개발환경 세팅 가이드를 먼저 따라주세요.

설정 완료 후:

```bash
git clone https://github.com/maxtortime/figure-curator.git
cd figure-curator
npm install
npm run tauri dev
```

---

## 기여 방법

### 버그 리포트

[GitHub Issues](https://github.com/maxtortime/figure-curator/issues)에 아래 내용을 포함해 등록해주세요:

- OS 및 버전
- 재현 방법
- 예상 동작 vs 실제 동작
- 가능하다면 스크린샷

### 새 쇼핑몰 크롤러 추가

`src-tauri/src/crawler/` 아래에 새 파일을 만들고 `ShopCrawler` 트레이트를 구현하면 됩니다.

**쇼핑몰 플랫폼 확인 방법:**

| 플랫폼 | 특징 |
|--------|------|
| Cafe24 | URL에 `product_no=` 포함, `/product/search.html` 검색 |
| MakeShop | URL에 `branduid=` 포함, `/shop/shopbrand.html` 검색 |
| 고도몰 | URL에 `goodsNo=` 포함, `/goods/goods_search.php` 검색 |
| 기타 | `custom` — 전용 모듈 작성 필요 |

**Cafe24 쇼핑몰 추가 예시** (`src-tauri/src/crawler/registry.rs`):

```rust
Arc::new(Cafe24Crawler::new(30, "새쇼핑몰", "example.com")),
```

EUC-KR 인코딩이면:
```rust
Arc::new(Cafe24Crawler::new(30, "새쇼핑몰", "example.com").with_encoding(encoding_rs::EUC_KR)),
```

POST 방식 검색이면:
```rust
Arc::new(Cafe24Crawler::new(30, "새쇼핑몰", "example.com").with_post()),
```

**커스텀 크롤러 작성 예시:**

```rust
// src-tauri/src/crawler/myshop.rs
use anyhow::Result;
use async_trait::async_trait;
use super::base::{CrawledProduct, ShopCrawler, HTTP_CLIENT};

pub struct MyShopCrawler;

#[async_trait]
impl ShopCrawler for MyShopCrawler {
    fn shop_id(&self) -> u32 { 30 }
    fn shop_name(&self) -> &str { "새쇼핑몰" }

    async fn search(&self, keyword: &str) -> Result<Vec<CrawledProduct>> {
        // 검색 로직 구현
        todo!()
    }
}
```

작성 후 `mod.rs`와 `registry.rs`에 등록해주세요.

### JS 렌더링이 필요한 쇼핑몰

SPA 기반 쇼핑몰은 `headless_chrome` 크레이트를 사용합니다. `goodsmile.rs`나 `herotime.rs`를 참고하세요.  
실행 환경에 Chrome/Edge/Whale 등 Chromium 계열 브라우저가 설치돼 있어야 합니다.

---

## Pull Request

1. `main` 브랜치에서 새 브랜치 생성: `git checkout -b feat/my-feature`
2. 변경 후 커밋 (커밋 메시지는 한국어 또는 영어 모두 가능)
3. `cargo check`로 Rust 컴파일 오류 없는지 확인
4. `npx tsc --noEmit`으로 TypeScript 타입 오류 없는지 확인
5. PR 제출 — 어떤 쇼핑몰을 추가했는지, 어떤 문제를 수정했는지 간략히 설명해주세요

---

## 코드 스타일

- **Rust**: `cargo fmt` 포맷 준수
- **TypeScript/CSS**: 기존 파일 스타일 유지
- 주석은 한국어 또는 영어 모두 가능

---

## 라이센스

기여한 코드는 [MIT License](LICENSE)로 배포됩니다.
