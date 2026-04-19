/**
 * Video 05 — 선택 모드 (목록에서 직접 그룹 생성)
 *
 * Timeline (30fps, 510 frames = 17s):
 *   0–40   결과 목록 보여줌
 *  40–100  "선택 모드" 버튼 클릭 → floating bar 등장
 * 100–220  카드 3개 순서대로 체크박스 선택
 * 220–300  "그룹 만들기" 버튼 클릭 → 그룹 뷰 전환
 * 300–430  새 Manual 그룹 등장
 * 430–510  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { AppWindow } from '../components/AppWindow';
import { ProductCardMock } from '../components/ProductCardMock';
import { GroupCardMock } from '../components/GroupCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { PRODUCTS, GROUPS } from '../data/mock';

const SELECT_MODE_FRAME  = 60;
const SELECT_1_FRAME     = 110;
const SELECT_2_FRAME     = 150;
const SELECT_3_FRAME     = 190;
const GROUP_BTN_FRAME    = 250;
const GROUP_VIEW_FRAME   = 300;
const TITLE_FRAME        = 430;

export const Select05: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const winY       = interpolate(frame, [0, 40], [20, 0], { extrapolateRight: 'clamp' });

  const selectMode  = frame >= SELECT_MODE_FRAME;
  const selected    = new Set<string>([
    frame >= SELECT_1_FRAME ? PRODUCTS[0].id : '',
    frame >= SELECT_2_FRAME ? PRODUCTS[1].id : '',
    frame >= SELECT_3_FRAME ? PRODUCTS[2].id : '',
  ].filter(Boolean));

  const groupBtnGlow = frame >= GROUP_BTN_FRAME && frame < GROUP_VIEW_FRAME;
  const showGroupView = frame >= GROUP_VIEW_FRAME;
  const showTitle     = frame >= TITLE_FRAME;

  const newGroup = {
    keyType: 'Jan' as const,
    keyValue: '선택한 상품',
    label: '내가 만든 그룹',
    items: PRODUCTS.slice(0, 3),
  };

  const groupVisibleCount = Math.floor(
    interpolate(frame, [GROUP_VIEW_FRAME + 10, GROUP_VIEW_FRAME + 60], [0, 4], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );

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
          <div style={{ minHeight: 560 }}>
            {/* Statusbar */}
            <StatusBar frame={frame} showGroupView={showGroupView} />

            {showGroupView ? (
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: T.t3,
                  letterSpacing: 1, textTransform: 'uppercase' as const,
                  marginBottom: 10, fontFamily: FONT,
                }}>
                  그룹화된 상품
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <GroupCardMock
                    group={{ ...newGroup, keyType: 'Jan', keyValue: 'Manual', label: '내가 만든 그룹' }}
                    frame={frame - GROUP_VIEW_FRAME - 10}
                    delay={0}
                  />
                  {GROUPS.slice(0, groupVisibleCount - 1).map((g, i) => (
                    <GroupCardMock
                      key={i}
                      group={g}
                      frame={frame - GROUP_VIEW_FRAME - 20}
                      delay={i * 15}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '0 0 20px' }}>
                {/* Select mode bar */}
                {selectMode && (
                  <SelectBar
                    count={selected.size}
                    groupBtnGlow={groupBtnGlow}
                    frame={frame}
                  />
                )}

                {/* Filter row */}
                <FilterRow selectMode={selectMode} frame={frame} />

                {/* Product grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10, padding: '0 20px',
                }}>
                  {PRODUCTS.slice(0, 8).map((p, i) => (
                    <SelectableCard
                      key={p.id}
                      product={p}
                      index={i}
                      frame={frame}
                      fps={fps}
                      selectMode={selectMode}
                      isSelected={selected.has(p.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AppWindow>
      </div>

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

// ── Sub-components ────────────────────────────────────

const StatusBar: React.FC<{ frame: number; showGroupView: boolean }> = ({ frame, showGroupView }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  const isGrouped = showGroupView;
  return (
    <div style={{
      padding: '12px 20px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${T.bd}`, marginBottom: 12,
      fontFamily: FONT, opacity,
    }}>
      <span style={{ fontSize: 12, color: T.t3 }}>
        <strong style={{ color: T.t1 }}>12</strong>개 결과
      </span>
      <span style={{ width: 1, height: 11, background: T.bd }} />
      <span style={{ fontSize: 11, color: T.t2, fontFamily: FONT_MONO }}>"넨도로이드 프리렌"</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, border: `1px solid ${T.bd}`, borderRadius: T.r2, overflow: 'hidden' }}>
        {['목록', '그룹'].map((label, i) => {
          const active = i === 0 ? !isGrouped : isGrouped;
          return (
            <div key={label} style={{
              padding: '3px 10px', fontSize: 11, fontFamily: FONT,
              background: active ? T.accentBg : T.s1,
              color: active ? T.accent : T.t3,
              fontWeight: active ? 600 : 400,
              borderRight: i === 0 ? `1px solid ${T.bd}` : 'none',
            }}>
              {label}
            </div>
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
      borderRadius: T.r, padding: '8px 14px',
      margin: '0 20px 10px', fontSize: 12.5,
      opacity, fontFamily: FONT,
    }}>
      <span style={{ flex: 1, fontWeight: 500 }}>
        {count > 0 ? `${count}개 선택됨` : '상품을 선택하세요'}
      </span>
      <div style={{
        background: count >= 2 ? T.accent : 'rgba(255,255,255,0.15)',
        border: `1px solid ${count >= 2 ? T.accent : 'rgba(255,255,255,0.25)'}`,
        borderRadius: T.r2, color: '#fff',
        fontSize: 11.5, padding: '4px 12px', cursor: 'pointer', fontFamily: FONT,
        fontWeight: 500,
        boxShadow: groupBtnGlow ? '0 0 0 4px rgba(37,99,235,0.4)' : 'none',
        transition: 'all 0.15s',
        opacity: count < 2 ? 0.45 : 1,
      }}>
        그룹 만들기
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: T.r2, color: '#fff',
        fontSize: 11.5, padding: '4px 12px', cursor: 'pointer', fontFamily: FONT,
      }}>
        취소
      </div>
    </div>
  );
};

const FilterRow: React.FC<{ selectMode: boolean; frame: number }> = ({ selectMode, frame }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 20px 10px', flexWrap: 'wrap' as const, opacity,
    }}>
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
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    fontFamily: FONT,
    boxShadow: active ? `0 0 0 3px ${T.accentBg}` : 'none',
    transition: 'all 0.2s',
    ...style,
  }}>
    {label}
  </div>
);

const SelectableCard: React.FC<{
  product: typeof PRODUCTS[0];
  index: number;
  frame: number;
  fps: number;
  selectMode: boolean;
  isSelected: boolean;
}> = ({ product, index, frame, fps, selectMode, isSelected }) => {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: T.surface,
        border: `1px solid ${isSelected ? T.accent : T.bd}`,
        borderRadius: T.r, overflow: 'hidden',
        boxShadow: isSelected
          ? `0 0 0 2px rgba(37,99,235,0.25), 0 1px 3px rgba(0,0,0,0.08)`
          : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {/* Image */}
        <div style={{
          aspectRatio: '1',
          background: `linear-gradient(135deg, ${product.color}cc, ${product.color}44)`,
          position: 'relative',
        }}>
          <FigureIcon color={product.color} />
          <div style={{
            position: 'absolute', top: 7, left: 7,
            background: T.accent, color: '#fff',
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, fontFamily: FONT,
          }}>
            {product.shop}
          </div>
          {/* Checkbox */}
          {selectMode && (
            <div style={{
              position: 'absolute', top: 7, right: 7,
              width: 18, height: 18, borderRadius: 4,
              border: `2px solid ${isSelected ? T.accent : 'rgba(255,255,255,0.8)'}`,
              background: isSelected ? T.accent : 'rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff',
              backdropFilter: 'blur(2px)',
              transition: 'all 0.15s',
            }}>
              {isSelected ? '✓' : ''}
            </div>
          )}
        </div>
        {/* Body */}
        <div style={{ padding: '8px 10px 10px', fontFamily: FONT }}>
          <p style={{
            fontSize: 10.5, color: T.t1, lineHeight: 1.4,
            margin: 0, marginBottom: 5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 28,
          }}>
            {product.name}
          </p>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: T.price }}>
            {product.isSoldOut ? '품절' : `₩${product.price.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

const FigureIcon: React.FC<{ color: string }> = ({ color }) => (
  <div style={{
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={0.85}>
      <rect x="10" y="32" width="28" height="10" rx="2" fill={color} fillOpacity="0.5" />
      <rect x="14" y="26" width="20" height="8" rx="2" fill={color} fillOpacity="0.7" />
      <circle cx="24" cy="18" r="8" fill={color} />
      <circle cx="24" cy="18" r="4" fill="white" fillOpacity="0.3" />
    </svg>
  </div>
);

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
          선택 모드
        </span>
      </div>
    </div>
  );
};
