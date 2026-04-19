/**
 * Video 02 — 결과 필터  (540 frames = 18s)
 *   0– 40  App in
 *  80–160  품절 제외 ON
 * 200–320  샵 칩 선택
 * 340–420  초기화
 * 450–540  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { ScaledApp } from '../components/ScaledApp';
import { ProductCardMock } from '../components/ProductCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { PRODUCTS } from '../data/mock';

const TOGGLE_FRAME = 80;
const CHIP_FRAME   = 200;
const RESET_FRAME  = 340;
const TITLE_FRAME  = 450;

const BG = 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)';

export const Filter02: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hideSoldOut  = frame >= TOGGLE_FRAME && frame < RESET_FRAME;
  const selectedShop = frame >= CHIP_FRAME && frame < RESET_FRAME ? '영웅시대' : null;
  const showTitle    = frame >= TITLE_FRAME;

  const visible = PRODUCTS.filter(p => {
    if (hideSoldOut && p.isSoldOut) return false;
    if (selectedShop && p.shop !== selectedShop) return false;
    return true;
  });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <GridBg />
      <TopLabel frame={frame} text="결과 필터" />

      <ScaledApp frame={frame} searchValue="넨도로이드 프리렌" contentHeight={950}>
        <FilterBar frame={frame} hideSoldOut={hideSoldOut} selectedShop={selectedShop} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '12px 20px 20px' }}>
          {visible.slice(0, 9).map((p, i) => (
            <ProductCardMock key={p.id} product={p} frame={i * 6} fps={fps} delay={0} />
          ))}
        </div>
      </ScaledApp>

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

const FilterBar: React.FC<{ frame: number; hideSoldOut: boolean; selectedShop: string | null }> = ({ frame, hideSoldOut, selectedShop }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  const shops = [...new Set(PRODUCTS.map(p => p.shop))].slice(0, 5);
  return (
    <div style={{
      padding: '12px 20px', display: 'flex', alignItems: 'center',
      gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${T.bd}`, opacity, fontFamily: FONT,
    }}>
      <Chip label="품절 제외" active={hideSoldOut} />
      {shops.map(s => <Chip key={s} label={s} active={selectedShop === s} count={PRODUCTS.filter(p => p.shop === s).length} />)}
    </div>
  );
};

const Chip: React.FC<{ label: string; active: boolean; count?: number }> = ({ label, active, count }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 999,
    border: `1px solid ${active ? T.accentBd : T.bd}`,
    background: active ? T.accentBg : T.s1,
    color: active ? T.accent : T.t2,
    fontSize: 11, fontWeight: active ? 600 : 400,
    boxShadow: active ? `0 0 0 3px ${T.accentBg}` : 'none',
    transition: 'all .2s',
  }}>
    {label}
    {count !== undefined && <span style={{ fontSize: 9.5, fontFamily: FONT_MONO, opacity: .7 }}>{count}</span>}
  </div>
);

const GridBg: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, opacity: .04,
    backgroundImage: `linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)`,
    backgroundSize: '48px 48px',
  }} />
);

const TopLabel: React.FC<{ frame: number; text: string }> = ({ frame, text }) => {
  const opacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: 68, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(37,99,235,.15)', border: '1px solid rgba(37,99,235,.35)',
        borderRadius: 999, padding: '5px 16px',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: T.accent }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', fontFamily: FONT, letterSpacing: 1 }}>{text}</span>
      </div>
    </div>
  );
};
