import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";

interface CrawledProduct {
  shop_id: number;
  shop_name: string;
  name: string;
  price: number | null;
  is_sold_out: boolean;
  source_url: string;
  source_product_id: string;
  jan_code: string | null;
  images: string[];
}

const JPY_SHOPS = new Set([28, 29]);

function formatPrice(price: number | null, shopId: number): string {
  if (price === null) return "가격 미정";
  return JPY_SHOPS.has(shopId)
    ? `¥${price.toLocaleString()}`
    : `₩${price.toLocaleString()}`;
}

function ProductCard({ product, index }: { product: CrawledProduct; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className={`card${product.is_sold_out ? " card--soldout" : ""}`}
      style={{ animationDelay: `${Math.min(index * 18, 300)}ms` }}
      onClick={() => openUrl(product.source_url)}
    >
      <div className="card__img-wrap">
        {!imgError && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="card__img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card__img-fallback">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {product.is_sold_out && (
          <div className="card__soldout">품절</div>
        )}
        <span className="card__badge">
          {product.shop_name}
        </span>
      </div>
      <div className="card__body">
        <p className="card__name">{product.name}</p>
        <div className="card__foot">
          <span className={`card__price${product.price === null ? " card__price--nil" : ""}`}>
            {formatPrice(product.price, product.shop_id)}
          </span>
          {product.jan_code && (
            <span className="card__jan">{product.jan_code}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card card--skel">
      <div className="skel skel--img" />
      <div className="card__body">
        <div className="skel skel--line" />
        <div className="skel skel--line skel--short" />
        <div className="skel skel--price" />
      </div>
    </div>
  );
}

type State = "idle" | "loading" | "done" | "error";

export default function App() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CrawledProduct[]>([]);
  const [uiState, setUiState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [duration, setDuration] = useState(0);
  const [lastKw, setLastKw] = useState("");
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const kw = keyword.trim();
    if (!kw || uiState === "loading") return;

    setUiState("loading");
    setErrMsg("");
    setLastKw(kw);
    const t0 = Date.now();

    try {
      const data = await invoke<CrawledProduct[]>("search", { keyword: kw });
      setResults(data);
      setSelectedShops(new Set());
      setDuration(Date.now() - t0);
      setUiState("done");
    } catch (err) {
      setErrMsg(String(err));
      setUiState("error");
    }
  }

  const loading = uiState === "loading";
  const shopList = Array.from(new Map(results.map(p => [p.shop_name, p.shop_id])).entries())
    .sort((a, b) => a[0].localeCompare(b[0], "ko"));
  const visibleResults = results.filter(p => {
    if (hideSoldOut && p.is_sold_out) return false;
    if (selectedShops.size > 0 && !selectedShops.has(p.shop_name)) return false;
    return true;
  });

  function toggleShop(name: string) {
    setSelectedShops(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/icon.png" alt="Figure Curator" className="brand__logo" />
            <span className="brand__name">Figure Curator</span>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <div className={`search${loading ? " search--busy" : ""}`}>
              <svg className="search__ico" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                className="search__input"
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="넨도로이드, figma, 건담..."
                disabled={loading}
                autoFocus
              />
              {loading && <span className="search__spin" />}
              <button
                className="search__btn"
                type="submit"
                disabled={loading || !keyword.trim()}
              >
                검색
              </button>
            </div>
          </form>
        </div>
      </header>

      <main className="main">
        {uiState === "idle" && (
          <div className="empty">
            <span className="empty__glyph">◎</span>
            <p className="empty__lead">22개 쇼핑몰 통합 검색</p>
            <p className="empty__sub">Cafe24 · MakeShop · 고도몰 · AmiAmi · GoodSmile</p>
          </div>
        )}

        {loading && (
          <>
            <div className="statusbar">
              <span className="statusbar__dot" />
              <span>검색 중…</span>
            </div>
            <div className="grid">
              {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        )}

        {uiState === "error" && (
          <div className="empty empty--err">
            <span className="empty__glyph">✕</span>
            <p className="empty__lead">오류가 발생했습니다</p>
            <p className="empty__sub">{errMsg}</p>
          </div>
        )}

        {uiState === "done" && (
          <>
            <div className="statusbar">
              <strong>{visibleResults.length}</strong>개 결과
              {(hideSoldOut || selectedShops.size > 0) && visibleResults.length !== results.length && (
                <span className="statusbar__filtered">({results.length - visibleResults.length}개 숨김)</span>
              )}
              <span className="statusbar__sep" />
              <span className="statusbar__kw">"{lastKw}"</span>
              <span className="statusbar__time">{(duration / 1000).toFixed(1)}s</span>
              <button
                className={`soldout-toggle${hideSoldOut ? " soldout-toggle--on" : ""}`}
                onClick={() => setHideSoldOut(v => !v)}
              >
                품절 제외
              </button>
            </div>
            {shopList.length > 1 && (
              <div className="shop-filter">
                {shopList.map(([name]) => (
                  <button
                    key={name}
                    className={`shop-chip${selectedShops.has(name) ? " shop-chip--on" : ""}`}
                    onClick={() => toggleShop(name)}
                  >
                    {name}
                    <span className="shop-chip__count">
                      {results.filter(p => p.shop_name === name).length}
                    </span>
                  </button>
                ))}
                {selectedShops.size > 0 && (
                  <button className="shop-chip shop-chip--reset" onClick={() => setSelectedShops(new Set())}>
                    초기화
                  </button>
                )}
              </div>
            )}

            {visibleResults.length === 0 ? (
              <div className="empty">
                <span className="empty__glyph">◌</span>
                <p className="empty__lead">결과 없음</p>
                <p className="empty__sub">{hideSoldOut ? "품절 제외 시 결과가 없습니다" : "다른 검색어를 시도해보세요"}</p>
              </div>
            ) : (
              <div className="grid">
                {visibleResults.map((p, i) => (
                  <ProductCard
                    key={`${p.shop_id}-${p.source_product_id}-${i}`}
                    product={p}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
