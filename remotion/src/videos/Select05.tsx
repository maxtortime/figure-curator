/**
 * Video 05 — 선택 모드  (510 frames = 17s)
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { ScaledApp } from '../components/ScaledApp';
import { GroupCardMock } from '../components/GroupCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { PRODUCTS, GROUPS } from '../data/mock';

const SELECT_MODE_FRAME = 60;
const SELECT_1_FRAME    = 110;
const SELECT_2_FRAME    = 150;
const SELECT_3_FRAME    = 190;
const GROUP_BTN_FRAME   = 250;
const GROUP_VIEW_FRAME  = 300;
const TITLE_FRAME       = 430;

const BG = 'linear-gradient(160deg, #0d1117 0%, #161b22 55%, #0f1a2e 100%)';

export const Select05: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const selectMode = frame >= SELECT_MODE_FRAME;
  const selected   = new Set([
    frame >= SELECT_1_FRAME ? PRODUCTS[0].id : '',
    frame >= SELECT_2_FRAME ? PRODUCTS[1].id : '',
    frame >= SELECT_3_FRAME ? PRODUCTS[2].id : '',
  ].filter(Boolean));

  const groupBtnGlow  = frame >= GROUP_BTN_FRAME && frame < GROUP_VIEW_FRAME;
  const showGroupView = frame >= GROUP_VIEW_FRAME;
  const showTitle     = frame >= TITLE_FRAME;

  const groupVisibleCount = Math.floor(
    interpolate(frame, [GROUP_VIEW_FRAME + 10, GROUP_VIEW_FRAME + 80], [0, 4], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <GridBg />
      <TopLabel frame={frame} text="선택 모드" />

      <ScaledApp frame={frame} searchValue="넨도로이드 프리렌" contentHeight={950}>
        <ViewBar frame={frame} isGrouped={showGroupView} />

        {showGroupView ? (
          <div style={{ padding: '4px 20px 20px' }}>
            <SectionLabel label="그룹화된 상품" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { keyType: 'Jan' as const, keyValue: 'Manual', label: '내가 만든 그룹', items: PRODUCTS.slice(0, 3) },
                ...GROUPS,
              ].slice(0, groupVisibleCount).map((g, i) => (
                <GroupCardMock key={i} group={g} frame={frame - GROUP_VIEW_FRAME - i * 20} delay={0} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            {selectMode && (
              <SelectBar count={selected.size} groupBtnGlow={groupBtnGlow} frame={frame} />
            )}
            <FilterRow selectMode={selectMode} frame={frame} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 20px' }}>
              {PRODUCTS.slice(0, 9).map((p, i) => (
                <SelectableCard key={p.id} product={p} selectMode={selectMode} isSelected={selected.has(p.id)} />
              ))}
            </div>
          </div>
        )}
      </ScaledApp>

      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_FRAME}
          headline="직접 골라서 그룹 만들기"
          sub="선택 모드에서 체크박스로 직접 그룹화"
          videoNum="05 · 선택 모드"
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
      borderBottom: `1px solid ${T.bd}`, marginBottom: 10, fontFamily: FONT, opacity,
    }}>
      <span style={{ fontSize: 12, color: T.t3 }}><strong style={{ color: T.t1 }}>12</strong>개 결과</span>
      <div style={{ marginLeft: 'auto', display: 'flex', border: `1px solid ${T.bd}`, borderRadius: T.r2, overflow: 'hidden' }}>
        {['목록', '그룹'].map((label, i) => {
          const active = i === 0 ? !isGrouped : isGrouped;
          return (
            <div key={label} style={{
              padding: '3px 10px', fontSize: 11, fontFamily: FONT,
              background: active ? T.accentBg : T.s1,
              color: active ? T.accent : T.t3, fontWeight: active ? 600 : 400,
              borderRight: i === 0 ? `1px solid ${T.bd}` : 'none',
            }}>{label}</div>
          );
        })}
      </div>
    </div>
  );
};

const SelectBar: React.FC<{ count: number; groupBtnGlow: boolean; frame: number }> = ({ count, groupBtnGlow, frame }) => {
  const opacity = interpolate(frame, [SELECT_MODE_FRAME, SELECT_MODE_FRAME + 14], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#111827', color: '#fff',
      borderRadius: T.r, padding: '8px 14px', margin: '0 20px 10px',
      fontSize: 12.5, opacity, fontFamily: FONT,
    }}>
      <span style={{ flex: 1, fontWeight: 500 }}>{count > 0 ? `${count}개 선택됨` : '상품을 선택하세요'}</span>
      <div style={{
        background: count >= 2 ? T.accent : 'rgba(255,255,255,.15)',
        border: `1px solid ${count >= 2 ? T.accent : 'rgba(255,255,255,.25)'}`,
        borderRadius: T.r2, color: '#fff', fontSize: 11.5, padding: '4px 12px', fontFamily: FONT, fontWeight: 500,
        boxShadow: groupBtnGlow ? '0 0 0 4px rgba(37,99,235,.4)' : 'none',
        opacity: count < 2 ? 0.45 : 1, transition: 'all .15s',
      }}>그룹 만들기</div>
      <div style={{
        background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
        borderRadius: T.r2, color: '#fff', fontSize: 11.5, padding: '4px 12px', fontFamily: FONT,
      }}>취소</div>
    </div>
  );
};

const FilterRow: React.FC<{ selectMode: boolean; frame: number }> = ({ selectMode, frame }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px 10px', opacity }}>
      <Chip label="품절 제외" active={false} />
      <Chip label="선택 모드" active={selectMode} style={{ marginLeft: 'auto' }} />
    </div>
  );
};

const Chip: React.FC<{ label: string; active: boolean; style?: React.CSSProperties }> = ({ label, active, style }) => (
  <div style={{
    padding: '3px 10px', borderRadius: 999,
    border: `1px solid ${active ? T.accentBd : T.bd}`,
    background: active ? T.accentBg : T.s1,
    color: active ? T.accent : T.t2,
    fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: FONT,
    boxShadow: active ? `0 0 0 3px ${T.accentBg}` : 'none',
    transition: 'all .2s', ...style,
  }}>{label}</div>
);

const SelectableCard: React.FC<{ product: typeof PRODUCTS[0]; selectMode: boolean; isSelected: boolean }> = ({ product, selectMode, isSelected }) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${isSelected ? T.accent : T.bd}`,
    borderRadius: T.r, overflow: 'hidden',
    boxShadow: isSelected ? `0 0 0 2px rgba(37,99,235,.25)` : '0 1px 3px rgba(0,0,0,.08)',
    transition: 'border-color .2s, box-shadow .2s',
  }}>
    <div style={{
      aspectRatio: '1',
      background: `linear-gradient(135deg,${product.color}cc,${product.color}44)`,
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" opacity=".85">
        <rect x="10" y="32" width="28" height="10" rx="2" fill={product.color} fillOpacity=".5"/>
        <rect x="14" y="26" width="20" height="8" rx="2" fill={product.color} fillOpacity=".7"/>
        <circle cx="24" cy="18" r="8" fill={product.color}/>
        <circle cx="24" cy="18" r="4" fill="white" fillOpacity=".3"/>
      </svg>
      <div style={{
        position: 'absolute', top: 7, left: 7,
        background: T.accent, color: '#fff', fontSize: 9, fontWeight: 700,
        padding: '2px 7px', borderRadius: 999, fontFamily: FONT,
      }}>{product.shop}</div>
      {selectMode && (
        <div style={{
          position: 'absolute', top: 7, right: 7,
          width: 18, height: 18, borderRadius: 4,
          border: `2px solid ${isSelected ? T.accent : 'rgba(255,255,255,.8)'}`,
          background: isSelected ? T.accent : 'rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', transition: 'all .15s',
        }}>{isSelected ? '✓' : ''}</div>
      )}
    </div>
    <div style={{ padding: '8px 10px 10px', fontFamily: FONT }}>
      <p style={{
        fontSize: 10.5, color: T.t1, lineHeight: 1.4, margin: 0, marginBottom: 5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 28,
      }}>{product.name}</p>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: T.price }}>
        {product.isSoldOut ? '품절' : `₩${product.price.toLocaleString()}`}
      </span>
    </div>
  </div>
);

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, color: T.t3, letterSpacing: 1,
    textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: FONT,
  }}>{label}</div>
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
