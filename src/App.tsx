import { useState, useRef, useEffect } from "react";
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

interface HistoryEntry {
  keyword: string;
  timestamp: number;
  total_count: number;
  available_count: number;
  products: CrawledProduct[];
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

const SHOPS = [
  '건담베이스', '건담붐', '코믹스아트', '영웅시대', '피규어앤컬렉션',
  '아루나샵', '레전드샵', '하비하우스', '하비큐빅', '에이지오브타이탄',
  '아이코닉토이즈', '라이즈토이즈', '마이리얼히어로', '오른팔왼팔',
  '원킹덤', '토이스로직', '피규어팝', '굿스마일컴퍼니(공홈)', 'AmiAmi',
  '히어로타임', '코우마샵', '도키도키굿즈', '이탄스토어', '마니아하우스',
  '코믹존', '레빗츠컴퍼니',
];

const FEATURES = [
  { num: '22', title: '쇼핑몰 동시 검색', desc: 'Cafe24, MakeShop, 고도몰 기반 쇼핑몰과 AmiAmi, 굿스마일 공홈까지 한 번의 검색으로.' },
  { num: '3', title: '크로스 플랫폼', desc: 'Windows, macOS, Linux. Tauri v2 기반으로 어느 OS에서도 동일하게 동작합니다.' },
  { num: '30s', title: '병렬 검색', desc: '모든 쇼핑몰을 동시에 병렬 크롤링. 최대 30초 안에 수백 개의 결과를 수집합니다.' },
  { num: '0원', title: '무료 오픈소스', desc: 'MIT 라이선스로 완전 무료. GitHub에 공개되어 있으며 새 쇼핑몰 기여를 환영합니다.' },
];

function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome__hero">
        <span className="welcome__eyebrow">무료 오픈소스 데스크탑 앱</span>
        <h1 className="welcome__title">한국 피규어 쇼핑몰 <em>22개</em> 통합 검색</h1>
        <p className="welcome__sub">넨도로이드, figma, 건담… 원하는 피규어를 22개 쇼핑몰에서 단 한 번에 찾아보세요.</p>
      </div>

      <div className="welcome__features">
        {FEATURES.map(f => (
          <div key={f.num} className="welcome__feature">
            <div className="welcome__feature-num">{f.num}</div>
            <div className="welcome__feature-title">{f.title}</div>
            <p className="welcome__feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="welcome__marquee-wrap">
        <div className="welcome__marquee-track">
          {[...SHOPS, ...SHOPS].map((s, i) => (
            <span key={i} className="welcome__shop-chip">{s}</span>
          ))}
        </div>
      </div>

      <div className="welcome__tech">
        {['Tauri v2', 'Rust', 'React', 'TypeScript', 'headless_chrome'].map(t => (
          <span key={t} className="welcome__tech-badge">{t}</span>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ entry, onSearch }: { entry: HistoryEntry; onSearch: (kw: string) => void }) {
  const previews = entry.products.slice(0, 4);
  return (
    <div className="history-card" onClick={() => onSearch(entry.keyword)}>
      <div className="history-card__thumbs">
        {previews.map((p, i) => (
          <div key={i} className="history-card__thumb">
            {p.images[0]
              ? <img src={p.images[0]} alt={p.name} />
              : <div className="history-card__thumb-empty" />}
          </div>
        ))}
        {previews.length === 0 && (
          <div className="history-card__thumb-empty history-card__thumb-empty--wide" />
        )}
      </div>
      <div className="history-card__info">
        <p className="history-card__label">
          최근 <strong>'{entry.keyword}'</strong>을(를) 검색하셨네요
        </p>
        <p className="history-card__meta">
          총 {entry.total_count}개 · 재고 있음 {entry.available_count}개
        </p>
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<HistoryEntry[]>("load_history")
      .then(setHistory)
      .catch(() => {});
  }, []);

  async function handleSearch(e?: React.FormEvent, overrideKw?: string) {
    e?.preventDefault();
    const kw = (overrideKw ?? keyword).trim();
    if (!kw || uiState === "loading") return;

    if (overrideKw) setKeyword(overrideKw);
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
      // 이력 갱신
      invoke<HistoryEntry[]>("load_history").then(setHistory).catch(() => {});
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
          <button
            className="brand"
            onClick={() => { setUiState("idle"); setKeyword(""); setResults([]); }}
            title="홈으로"
          >
            <img src="/icon.png" alt="Figure Curator" className="brand__logo" />
            <span className="brand__name">Figure Curator</span>
          </button>

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
          <>
            {history.length === 0 ? (
              <Welcome />
            ) : (
              <div className="history">
                <p className="history__title">최근 검색</p>
                <div className="history__list">
                  {history.map((entry) => (
                    <HistoryCard
                      key={entry.timestamp}
                      entry={entry}
                      onSearch={(kw) => handleSearch(undefined, kw)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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
