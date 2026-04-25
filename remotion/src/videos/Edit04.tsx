/**
 * Video 04 — 그룹 편집
 *
 * Timeline (30fps, 540 frames = 18s):
 *   0–40   편집 페이지 fade in (그룹 목록)
 *  40–150  그룹 row 클릭 → expand (상품 목록 펼침)
 * 150–270  이름 입력 인풋 등장 → 텍스트 타이핑
 * 270–390  개별 상품 row → "그룹 추가" 드롭다운 오픈
 * 390–490  저장 버튼 클릭 효과
 * 490–540  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { AppWindow } from '../components/AppWindow';
import { TitleSlate } from '../components/TitleSlate';
import { GROUPS, PRODUCTS } from '../data/mock';

const EXPAND_FRAME   = 80;
const LABEL_FRAME    = 160;
const DROPDOWN_FRAME = 290;
const SAVE_FRAME     = 410;
const TITLE_FRAME    = 490;

const LABEL_TEXT = '넨도로이드 2159 프리렌';

export const Edit04: React.FC = () => {
  const frame = useCurrentFrame();

  const winOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const winY       = interpolate(frame, [0, 40], [20, 0], { extrapolateRight: 'clamp' });

  const expanded       = frame >= EXPAND_FRAME;
  const editingLabel   = frame >= LABEL_FRAME && frame < DROPDOWN_FRAME;
  const labelProgress  = Math.floor(
    interpolate(frame, [LABEL_FRAME + 10, LABEL_FRAME + LABEL_TEXT.length * 5], [0, LABEL_TEXT.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );
  const labelDraft     = editingLabel ? LABEL_TEXT.slice(0, labelProgress) : LABEL_TEXT.slice(0, labelProgress);
  const showDropdown   = frame >= DROPDOWN_FRAME && frame < SAVE_FRAME;
  const saveHighlight  = frame >= SAVE_FRAME;
  const showTitle      = frame >= TITLE_FRAME;

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
          <div style={{ minHeight: 560, padding: '20px 20px' }}>
            {/* Header */}
            <EditorHeader saveHighlight={saveHighlight} frame={frame} />

            {/* Groups */}
            <SectionTitle label="그룹화된 상품" count={GROUPS.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {GROUPS.map((g, gi) => (
                <EditorGroupRow
                  key={gi}
                  group={g}
                  isFirst={gi === 0}
                  expanded={gi === 0 && expanded}
                  editingLabel={gi === 0 && editingLabel}
                  labelDraft={gi === 0 ? labelDraft : (g.label ?? '')}
                  frame={frame}
                />
              ))}
            </div>

            {/* Ungrouped */}
            <SectionTitle label="개별 상품" count={2} />
            <UnGroupedRow
              product={PRODUCTS[6]}
              showDropdown={showDropdown}
              groups={GROUPS}
              frame={frame}
            />
          </div>
        </AppWindow>
      </div>

      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_FRAME}
          headline="그룹을 내 맘대로 편집"
          sub="이름 변경 · 항목 추가/제거 · 수동 그룹 생성"
          videoNum="04 · 그룹 편집"
        />
      )}
    </AbsoluteFill>
  );
};

// ── Sub-components ────────────────────────────────────

const EditorHeader: React.FC<{ saveHighlight: boolean; frame: number }> = ({ saveHighlight, frame }) => {
  const opacity = interpolate(frame, [5, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 20, opacity,
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT }}>
          그룹 편집
        </span>
        <span style={{ fontSize: 12, color: T.t3, fontFamily: FONT_MONO, marginLeft: 8 }}>
          "넨도로이드 프리렌" · 3그룹 / 2개 개별
        </span>
      </div>
      <button style={{
        border: `1px solid ${T.bd}`, borderRadius: T.r2,
        background: T.s1, color: T.t2,
        fontSize: 11.5, fontFamily: FONT, padding: '5px 12px', cursor: 'pointer',
      }}>취소</button>
      <button style={{
        border: `1px solid ${saveHighlight ? '#1d4ed8' : T.accent}`,
        borderRadius: T.r2,
        background: saveHighlight ? '#1d4ed8' : T.accent,
        color: '#fff', fontSize: 11.5, fontFamily: FONT,
        padding: '5px 12px', cursor: 'pointer',
        boxShadow: saveHighlight ? '0 0 0 3px rgba(37,99,235,0.3)' : 'none',
        transition: 'all 0.15s',
        fontWeight: 600,
      }}>저장</button>
    </div>
  );
};

const SectionTitle: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
    fontSize: 11, fontWeight: 600, color: T.t3,
    letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: FONT,
  }}>
    {label}
    <span style={{
      fontFamily: FONT_MONO, fontSize: 10,
      background: T.s2, border: `1px solid ${T.bd}`,
      borderRadius: 999, padding: '1px 7px', color: T.t3,
    }}>{count}</span>
  </div>
);

const EditorGroupRow: React.FC<{
  group: typeof GROUPS[0];
  isFirst: boolean;
  expanded: boolean;
  editingLabel: boolean;
  labelDraft: string;
  frame: number;
}> = ({ group, isFirst, expanded, editingLabel, labelDraft, frame }) => {
  const rep = group.items[0];
  const itemsHeight = interpolate(
    frame, [EXPAND_FRAME, EXPAND_FRAME + 20], [0, group.items.length * 44],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${expanded && isFirst ? T.accentBd : T.bd}`,
      borderRadius: T.r,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: T.r2,
          background: `linear-gradient(135deg, ${rep.color}cc, ${rep.color}44)`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingLabel && isFirst ? (
            <div style={{
              border: `1px solid ${T.accentBd}`,
              borderRadius: T.r2, background: T.accentBg,
              padding: '3px 8px',
              fontSize: 12.5, fontWeight: 600, color: T.t1,
              fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 2,
              minWidth: 220,
            }}>
              {labelDraft}
              <span style={{ width: 2, height: 14, background: T.accent, borderRadius: 1, display: 'inline-block', marginLeft: 1 }} />
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: T.t1, fontFamily: FONT }}>
              {labelDraft || group.label}
            </p>
          )}
          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: T.t3, fontFamily: FONT_MONO }}>
            {group.items.length}개 샵
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Btn label="이름" highlight={editingLabel && isFirst} />
          <Btn label="해제" danger />
        </div>
        <span style={{ color: T.t3, fontSize: 10 }}>{expanded && isFirst ? '▲' : '▼'}</span>
      </div>

      {/* Expanded items */}
      {expanded && isFirst && (
        <div style={{
          borderTop: `1px solid ${T.bd}`,
          padding: '8px 14px',
          height: itemsHeight,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {group.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
              borderBottom: i < group.items.length - 1 ? `1px solid ${T.s2}` : 'none',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 3, background: `${item.color}55`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, color: T.t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT }}>
                {item.name}
              </span>
              <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT_MONO, flexShrink: 0 }}>{item.shop}</span>
              <span style={{ fontSize: 13, color: T.t3, cursor: 'pointer', padding: '0 2px' }}>✕</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Btn: React.FC<{ label: string; danger?: boolean; highlight?: boolean }> = ({ label, danger, highlight }) => (
  <div style={{
    border: `1px solid ${highlight ? T.accentBd : T.bd}`,
    borderRadius: T.r2, background: highlight ? T.accentBg : 'none',
    color: highlight ? T.accent : T.t3,
    fontSize: 11, padding: '3px 8px', cursor: 'pointer', fontFamily: FONT,
  }}>
    {label}
  </div>
);

const UnGroupedRow: React.FC<{
  product: typeof PRODUCTS[0];
  showDropdown: boolean;
  groups: typeof GROUPS;
  frame: number;
}> = ({ product, showDropdown, groups, frame }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'relative', opacity }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px', borderRadius: T.r2,
        border: `1px solid ${showDropdown ? T.accentBd : 'transparent'}`,
        background: showDropdown ? T.accentBg : T.s1,
        transition: 'all 0.15s',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 3, background: `${product.color}55`, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11.5, color: T.t2, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </span>
        <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT_MONO }}>{product.shop}</span>
        <div style={{
          marginLeft: 8,
          border: `1px solid ${showDropdown ? T.accentBd : T.bd}`,
          borderRadius: T.r2,
          background: showDropdown ? T.accentBg : 'none',
          color: showDropdown ? T.accent : T.t3,
          fontSize: 11, padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
          whiteSpace: 'nowrap',
        }}>
          그룹 추가 ▾
        </div>
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 3,
          background: T.surface, border: `1px solid ${T.bd}`,
          borderRadius: T.r, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 10, minWidth: 220,
          animation: 'none',
        }}>
          {groups.map((g, i) => (
            <div key={i} style={{
              padding: '8px 12px', fontSize: 11.5, color: T.t2,
              borderBottom: `1px solid ${T.s2}`, cursor: 'pointer',
              fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {g.label}
            </div>
          ))}
          <div style={{
            padding: '8px 12px', fontSize: 11.5, color: T.accent,
            fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
          }}>
            + 새 그룹으로 만들기
          </div>
        </div>
      )}
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
          그룹 편집
        </span>
      </div>
    </div>
  );
};
