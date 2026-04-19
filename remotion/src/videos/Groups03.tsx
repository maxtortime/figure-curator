/**
 * Video 03 — 자동 그룹화  (570 frames = 19s)
 *   0– 40  App in (list view)
 *  80–120  그룹 탭 클릭
 * 130–310  3개 그룹 등장 (JAN → No. → 유사도)
 * 510–570  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { ScaledApp } from '../components/ScaledApp';
import { GroupCardMock } from '../components/GroupCardMock';
import { ProductCardMock } from '../components/ProductCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { GROUPS, PRODUCTS } from '../data/mock';

const TOGGLE_FRAME = 80;
const GROUP_START  = 130;
const TITLE_FRAME  = 510;

const BG = 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)';

export const Groups03: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isGrouped = frame >= TOGGLE_FRAME;
  const groupVisibleCount = Math.floor(
    interpolate(frame, [GROUP_START, GROUP_START + GROUPS.length * 55], [0, GROUPS.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );
  const showTitle = frame >= TITLE_FRAME;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <GridBg />
      <TopLabel frame={frame} text="자동 그룹화" />

      <ScaledApp frame={frame} searchValue="넨도로이드 프리렌" contentHeight={950}>
        <ViewBar frame={frame} isGrouped={isGrouped} />

        {isGrouped ? (
          <div style={{ padding: '4px 20px 20px' }}>
            <SectionLabel label="그룹화된 상품" count={GROUPS.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GROUPS.slice(0, groupVisibleCount).map((g, i) => (
                <GroupCardMock key={i} group={g} frame={frame - GROUP_START - i * 55} delay={0} />
              ))}
            </div>
            {groupVisibleCount === GROUPS.length && (
              <div style={{ marginTop: 20 }}>
                <SectionLabel label="개별 상품" count={PRODUCTS.length - 11} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {PRODUCTS.slice(9, 12).map((p, i) => (
                    <ProductCardMock key={p.id} product={p} frame={frame - GROUP_START - 170} fps={fps} delay={i * 10} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ListPlaceholder />
        )}
      </ScaledApp>

      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_FRAME}
          headline="같은 상품, 자동 그룹화"
          sub="JAN 코드 · 품번 · 텍스트 유사도 3단계 분류"
          videoNum="03 · 자동 그룹화"
        />
      )}
    </AbsoluteFill>
  );
};

const ViewBar: React.FC<{ frame: number; isGrouped: boolean }> = ({ frame, isGrouped }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      padding: '12px 20px 14px', display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${T.bd}`, marginBottom: 14, fontFamily: FONT, opacity,
    }}>
      <span style={{ fontSize: 12, color: T.t3 }}><strong style={{ color: T.t1 }}>12</strong>개 결과</span>
      <span style={{ width: 1, height: 11, background: T.bd }} />
      <span style={{ fontSize: 11, color: T.t2, fontFamily: FONT_MONO }}>"넨도로이드 프리렌"</span>
      <div style={{ marginLeft: 'auto', display: 'flex', border: `1px solid ${T.bd}`, borderRadius: T.r2, overflow: 'hidden' }}>
        {['목록', '그룹'].map((label, i) => {
          const active = i === 0 ? !isGrouped : isGrouped;
          return (
            <div key={label} style={{
              padding: '3px 10px', fontSize: 11, fontFamily: FONT,
              background: active ? T.accentBg : T.s1,
              color: active ? T.accent : T.t3, fontWeight: active ? 600 : 400,
              borderRight: i === 0 ? `1px solid ${T.bd}` : 'none',
              boxShadow: active ? `0 0 0 3px ${T.accentBg}` : 'none',
              transition: 'all .2s',
            }}>{label}</div>
          );
        })}
      </div>
    </div>
  );
};

const SectionLabel: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
    fontSize: 11, fontWeight: 600, color: T.t3,
    letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: FONT,
  }}>
    {label}
    <span style={{
      fontFamily: FONT_MONO, fontSize: 10, background: T.s2,
      border: `1px solid ${T.bd}`, borderRadius: 999, padding: '1px 7px', color: T.t3,
    }}>{count}</span>
  </div>
);

const ListPlaceholder: React.FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 20px' }}>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} style={{ background: T.surface, border: `1px solid ${T.bd}`, borderRadius: T.r, overflow: 'hidden', opacity: .6 }}>
        <div style={{ aspectRatio: '1', background: T.s2 }} />
        <div style={{ padding: 10 }}>
          <div style={{ height: 10, background: T.s2, borderRadius: 3, marginBottom: 5 }} />
          <div style={{ height: 10, background: T.s2, borderRadius: 3, width: '60%' }} />
        </div>
      </div>
    ))}
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
