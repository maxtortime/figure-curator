/**
 * Video 01 — 통합 검색
 *
 * Timeline (30fps, 630 frames = 21s):
 *   0–45   App window fades + slides in
 *  45–90   Welcome/idle state visible
 *  75–145  Typing "넨도로이드 프리렌"
 * 145–175  Brief pause (search submitted)
 * 175–375  Shop ticker crawling (22 shops)
 * 360–510  Product grid appears (staggered)
 * 510–555  Stats badge animates
 * 555–630  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { AppWindow } from '../components/AppWindow';
import { ShopTicker } from '../components/ShopTicker';
import { ProductCardMock } from '../components/ProductCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { SHOPS, PRODUCTS } from '../data/mock';

// ── Scene constants ───────────────────────────────────
const SEARCH_TEXT = '넨도로이드 프리렌';
const TYPE_START  = 75;
const TYPE_CHARS  = SEARCH_TEXT.length; // 10
const TYPE_RATE   = 6; // frames per char
const CRAWL_START = 175;
const CRAWL_END   = 375;
const RESULT_START = 360;
const STATS_START  = 510;
const TITLE_START  = 555;

// ── Main composition ──────────────────────────────────
export const Search01: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Typing
  const typedN = Math.floor(
    interpolate(frame, [TYPE_START, TYPE_START + TYPE_CHARS * TYPE_RATE], [0, TYPE_CHARS], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );
  const searchValue = SEARCH_TEXT.slice(0, typedN);
  const showCursor  = frame >= TYPE_START && frame < CRAWL_START;

  // Window entrance
  const winOpacity  = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const winY        = interpolate(frame, [0, 45], [28, 0], { extrapolateRight: 'clamp' });

  // Crawl progress
  const crawlProgress = interpolate(frame, [CRAWL_START, CRAWL_END], [0, SHOPS.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const doneCount   = Math.floor(crawlProgress);
  const activeIndex = Math.min(doneCount, SHOPS.length - 1);

  // Results
  const resultsVisible = frame >= RESULT_START;
  const resultProgress = interpolate(
    frame,
    [RESULT_START, RESULT_START + PRODUCTS.length * 14],
    [0, PRODUCTS.length],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const visibleCount = Math.floor(resultProgress);

  // Stats
  const statsOpacity = interpolate(frame, [STATS_START, STATS_START + 20], [0, 1], { extrapolateRight: 'clamp' });
  const showStats = frame >= STATS_START;

  // Title
  const showTitle = frame >= TITLE_START;

  // Content section to show
  const showCrawl   = frame >= CRAWL_START && !resultsVisible;
  const showResults = resultsVisible;

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)',
      fontFamily: FONT,
    }}>
      {/* Subtle grid overlay */}
      <GridBg />

      {/* Section label (top) */}
      <TopLabel frame={frame} />

      {/* App window */}
      <div style={{
        position: 'absolute',
        top: 230,
        left: '50%',
        transform: `translateX(-50%) translateY(${winY}px)`,
        opacity: winOpacity,
        width: 1000,
      }}>
        <AppWindow searchValue={searchValue} showCursor={showCursor}>
          <div style={{ minHeight: 520 }}>
            {showResults ? (
              <ResultsContent
                visibleCount={visibleCount}
                frame={frame}
                fps={fps}
                statsOpacity={showStats ? statsOpacity : 0}
              />
            ) : showCrawl ? (
              <ShopTicker
                shops={SHOPS}
                doneCount={doneCount}
                activeIndex={activeIndex}
              />
            ) : (
              <WelcomeContent />
            )}
          </div>
        </AppWindow>
      </div>

      {/* Title slate at end */}
      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_START}
          headline={'22개 쇼핑몰을\n단 한 번에'}
          sub="검색어 하나로 전 쇼핑몰 동시 크롤링"
          videoNum="01 · 통합 검색"
        />
      )}
    </AbsoluteFill>
  );
};

// ── Sub-components ────────────────────────────────────

const GridBg: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, opacity: 0.04,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
  }} />
);

const TopLabel: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', top: 100, left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, opacity,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(37,99,235,0.15)',
        border: '1px solid rgba(37,99,235,0.35)',
        borderRadius: 999,
        padding: '5px 16px',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: 3,
          background: T.accent,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', fontFamily: FONT, letterSpacing: 1 }}>
          통합 검색
        </span>
      </div>
    </div>
  );
};

const WelcomeContent: React.FC = () => (
  <div style={{
    padding: '48px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: 520,
    gap: 12,
  }}>
    <div style={{
      fontSize: 32, fontWeight: 700, color: T.t1, textAlign: 'center',
      lineHeight: 1.25, letterSpacing: -0.5, fontFamily: FONT,
    }}>
      한국 피규어 쇼핑몰<br />
      <span style={{ color: T.accent }}>22개</span> 통합 검색
    </div>
    <p style={{ fontSize: 13.5, color: T.t2, textAlign: 'center', lineHeight: 1.7, fontFamily: FONT, margin: 0 }}>
      넨도로이드, figma, 건담… 원하는 피규어를<br />22개 쇼핑몰에서 단 한 번에 찾아보세요.
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
      {['Tauri v2', 'Rust', 'React', 'TypeScript'].map(t => (
        <span key={t} style={{
          fontFamily: FONT_MONO, fontSize: 11,
          padding: '3px 10px', borderRadius: T.r2,
          border: `1px solid ${T.bd}`, color: T.t2,
          background: T.surface,
        }}>
          {t}
        </span>
      ))}
    </div>
  </div>
);

interface ResultsContentProps {
  visibleCount: number;
  frame: number;
  fps: number;
  statsOpacity: number;
}

const ResultsContent: React.FC<ResultsContentProps> = ({ visibleCount, frame, fps, statsOpacity }) => (
  <div style={{ padding: '0 0 24px' }}>
    {/* Statusbar */}
    <div style={{
      padding: '12px 20px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${T.bd}`,
      marginBottom: 16,
      fontFamily: FONT,
    }}>
      <span style={{ fontSize: 12, color: T.t3 }}>
        <strong style={{ color: T.t1, fontWeight: 600 }}>{visibleCount}</strong>개 결과
      </span>
      <span style={{ width: 1, height: 11, background: T.bd }} />
      <span style={{ fontSize: 11, color: T.t2, fontFamily: FONT_MONO }}>"넨도로이드 프리렌"</span>
      <div style={{
        marginLeft: 'auto',
        display: 'flex', gap: 0,
        border: `1px solid ${T.bd}`, borderRadius: T.r2, overflow: 'hidden',
      }}>
        {['목록', '그룹'].map((label, i) => (
          <div key={label} style={{
            padding: '3px 10px', fontSize: 11, fontFamily: FONT,
            background: i === 0 ? T.accentBg : T.s1,
            color: i === 0 ? T.accent : T.t3,
            fontWeight: i === 0 ? 600 : 400,
            borderRight: i === 0 ? `1px solid ${T.bd}` : 'none',
          }}>
            {label}
          </div>
        ))}
      </div>
    </div>

    {/* Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 10,
      padding: '0 20px',
    }}>
      {PRODUCTS.slice(0, visibleCount).map((p, i) => (
        <ProductCardMock
          key={p.id}
          product={p}
          frame={frame - RESULT_START}
          fps={fps}
          delay={i * 12}
        />
      ))}
    </div>
  </div>
);
