/**
 * Video 01 — 통합 검색  (1080×1920, 30fps, 630 frames = 21s)
 *
 *   0– 45  App slides in
 *  45– 75  Welcome/idle
 *  75–145  Typing "넨도로이드 프리렌"
 * 145–175  Pause (search submitted)
 * 175–375  Shop ticker (22 shops crawling)
 * 360–530  Product grid appears (staggered, 3-col × 3-row = 9 cards)
 * 530–560  Stats badge
 * 560–630  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { ScaledApp } from '../components/ScaledApp';
import { ShopTicker } from '../components/ShopTicker';
import { ProductCardMock } from '../components/ProductCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { SHOPS, PRODUCTS } from '../data/mock';

const SEARCH_TEXT  = '넨도로이드 프리렌';
const TYPE_START   = 75;
const CRAWL_START  = 175;
const CRAWL_END    = 375;
const RESULT_START = 360;
const TITLE_START  = 560;

export const Search01: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typedN = Math.floor(
    interpolate(frame, [TYPE_START, TYPE_START + SEARCH_TEXT.length * 6], [0, SEARCH_TEXT.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );
  const searchValue = SEARCH_TEXT.slice(0, typedN);
  const showCursor  = frame >= TYPE_START && frame < CRAWL_START;

  const crawlProgress = interpolate(frame, [CRAWL_START, CRAWL_END], [0, SHOPS.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const doneCount   = Math.floor(crawlProgress);
  const activeIndex = Math.min(doneCount, SHOPS.length - 1);

  const showCrawl   = frame >= CRAWL_START && frame < RESULT_START;
  const showResults = frame >= RESULT_START;

  const resultProgress = interpolate(
    frame, [RESULT_START, RESULT_START + 9 * 12], [0, 9],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const visibleCount = Math.floor(resultProgress);
  const showTitle = frame >= TITLE_START;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <GridBg />
      <TopLabel frame={frame} text="통합 검색" />

      <ScaledApp
        frame={frame}
        searchValue={searchValue}
        showCursor={showCursor}
        contentHeight={950}
      >
        {showResults ? (
          <ResultsContent visibleCount={visibleCount} frame={frame} fps={fps} />
        ) : showCrawl ? (
          <ShopTicker shops={SHOPS} doneCount={doneCount} activeIndex={activeIndex} />
        ) : (
          <WelcomeContent />
        )}
      </ScaledApp>

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

// ── Sub-components ─────────────────────────────────────

const BG = 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)';

const GridBg: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, opacity: 0.04,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)`,
    backgroundSize: '48px 48px',
  }} />
);

const TopLabel: React.FC<{ frame: number; text: string }> = ({ frame, text }) => {
  const opacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', top: 68, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', opacity,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(37,99,235,.15)', border: '1px solid rgba(37,99,235,.35)',
        borderRadius: 999, padding: '5px 16px',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: T.accent }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', fontFamily: FONT, letterSpacing: 1 }}>
          {text}
        </span>
      </div>
    </div>
  );
};

const WelcomeContent: React.FC = () => (
  <div style={{
    padding: '56px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 14, fontFamily: FONT,
  }}>
    <div style={{ fontSize: 34, fontWeight: 700, color: T.t1, textAlign: 'center', lineHeight: 1.25, letterSpacing: -0.5 }}>
      한국 피규어 쇼핑몰<br /><span style={{ color: T.accent }}>22개</span> 통합 검색
    </div>
    <p style={{ fontSize: 14, color: T.t2, textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
      넨도로이드, figma, 건담… 원하는 피규어를<br />22개 쇼핑몰에서 단 한 번에.
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
      {['Tauri v2', 'Rust', 'React', 'TypeScript'].map(t => (
        <span key={t} style={{
          fontFamily: FONT_MONO, fontSize: 11, padding: '3px 10px',
          borderRadius: T.r2, border: `1px solid ${T.bd}`, color: T.t2, background: T.surface,
        }}>{t}</span>
      ))}
    </div>
  </div>
);

const ResultsContent: React.FC<{ visibleCount: number; frame: number; fps: number }> = ({ visibleCount, frame, fps }) => (
  <div style={{ paddingBottom: 24 }}>
    <div style={{
      padding: '12px 20px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${T.bd}`, marginBottom: 16, fontFamily: FONT,
    }}>
      <span style={{ fontSize: 12, color: T.t3 }}>
        <strong style={{ color: T.t1 }}>{visibleCount}</strong>개 결과
      </span>
      <span style={{ width: 1, height: 11, background: T.bd }} />
      <span style={{ fontSize: 11, color: T.t2, fontFamily: FONT_MONO }}>"넨도로이드 프리렌"</span>
      <div style={{
        marginLeft: 'auto', display: 'flex', gap: 0,
        border: `1px solid ${T.bd}`, borderRadius: T.r2, overflow: 'hidden',
      }}>
        {['목록', '그룹'].map((label, i) => (
          <div key={label} style={{
            padding: '3px 10px', fontSize: 11, fontFamily: FONT,
            background: i === 0 ? T.accentBg : T.s1,
            color: i === 0 ? T.accent : T.t3, fontWeight: i === 0 ? 600 : 400,
            borderRight: i === 0 ? `1px solid ${T.bd}` : 'none',
          }}>{label}</div>
        ))}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 20px' }}>
      {PRODUCTS.slice(0, Math.min(visibleCount, 9)).map((p, i) => (
        <ProductCardMock key={p.id} product={p} frame={frame - RESULT_START} fps={fps} delay={i * 12} />
      ))}
    </div>
  </div>
);
