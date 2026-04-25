/**
 * Video 02 — 결과 필터
 *
 * Timeline (30fps, 540 frames = 18s):
 *   0–40   App window in, results already showing
 *  40–160  품절 제외 toggle ON → sold-out cards fade out
 * 160–300  Shop chip 클릭 → 특정 샵만 필터
 * 300–420  필터 초기화
 * 420–540  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { AppWindow } from '../components/AppWindow';
import { ProductCardMock } from '../components/ProductCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { PRODUCTS } from '../data/mock';

const TOGGLE_FRAME  = 80;
const CHIP_FRAME    = 200;
const RESET_FRAME   = 340;
const TITLE_FRAME   = 450;

export const Filter02: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const winY       = interpolate(frame, [0, 40], [20, 0], { extrapolateRight: 'clamp' });

  const hideSoldOut  = frame >= TOGGLE_FRAME && frame < RESET_FRAME;
  const selectedShop = frame >= CHIP_FRAME && frame < RESET_FRAME ? '영웅시대' : null;

  const toggleOpacity = interpolate(
    frame, [TOGGLE_FRAME - 5, TOGGLE_FRAME + 10], [0.4, 1], { extrapolateRight: 'clamp' }
  );

  const visible = PRODUCTS.filter(p => {
    if (hideSoldOut && p.isSoldOut) return false;
    if (selectedShop && p.shop !== selectedShop) return false;
    return true;
  });

  const showTitle = frame >= TITLE_FRAME;

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)',
      fontFamily: FONT,
    }}>
      <GridBg />
      <TopLabel frame={frame} />

      <div style={{
        position: 'absolute', top: 230, left: '50%',
        transform: `translateX(-50%) translateY(${winY}px)`,
        opacity: winOpacity, width: 1000,
      }}>
        <AppWindow searchValue="넨도로이드 프리렌">
          <div style={{ minHeight: 540 }}>
            {/* Filter bar */}
            <FilterBar
              hideSoldOut={hideSoldOut}
              selectedShop={selectedShop}
              toggleOpacity={toggleOpacity}
              frame={frame}
            />
            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10, padding: '0 20px 20px',
            }}>
              {visible.map((p, i) => (
                <ProductCardMock key={p.id} product={p} frame={i * 8} fps={fps} delay={0} />
              ))}
            </div>
          </div>
        </AppWindow>
      </div>

      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_FRAME}
          headline="샵 필터 &amp; 품절 제외"
          sub="원하는 쇼핑몰만 골라 빠르게 비교"
          videoNum="02 · 결과 필터"
        />
      )}
    </AbsoluteFill>
  );
};

const FilterBar: React.FC<{
  hideSoldOut: boolean;
  selectedShop: string | null;
  toggleOpacity: number;
  frame: number;
}> = ({ hideSoldOut, selectedShop, toggleOpacity, frame }) => {
  const shopNames = [...new Set(PRODUCTS.map(p => p.shop))].slice(0, 6);
  const barOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: `1px solid ${T.bd}`,
      flexWrap: 'wrap',
      opacity: barOpacity,
      fontFamily: FONT,
    }}>
      {/* 품절 제외 toggle */}
      <div style={{
        padding: '3px 10px', borderRadius: 999,
        border: `1px solid ${hideSoldOut ? T.accentBd : T.bd}`,
        background: hideSoldOut ? T.accentBg : T.s1,
        color: hideSoldOut ? T.accent : T.t2,
        fontSize: 11, fontWeight: hideSoldOut ? 600 : 400,
        cursor: 'pointer', whiteSpace: 'nowrap',
        boxShadow: hideSoldOut ? `0 0 0 3px ${T.accentBg}` : 'none',
        opacity: toggleOpacity,
        transition: 'all 0.2s',
      }}>
        품절 제외
      </div>

      {shopNames.map(shop => (
        <div key={shop} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          border: `1px solid ${selectedShop === shop ? T.accentBd : T.bd}`,
          background: selectedShop === shop ? T.accentBg : T.s1,
          color: selectedShop === shop ? T.accent : T.t2,
          fontSize: 11, fontWeight: selectedShop === shop ? 600 : 400,
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}>
          {shop}
          <span style={{ fontSize: 9.5, fontFamily: FONT_MONO, opacity: 0.7 }}>
            {PRODUCTS.filter(p => p.shop === shop).length}
          </span>
        </div>
      ))}
    </div>
  );
};

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
      display: 'flex', justifyContent: 'center', opacity,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(37,99,235,0.15)',
        border: '1px solid rgba(37,99,235,0.35)',
        borderRadius: 999, padding: '5px 16px',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: T.accent }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', fontFamily: FONT, letterSpacing: 1 }}>
          결과 필터
        </span>
      </div>
    </div>
  );
};
