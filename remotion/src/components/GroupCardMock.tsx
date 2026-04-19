import React from 'react';
import { interpolate } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { MockGroup } from '../data/mock';

interface Props {
  group: MockGroup;
  frame: number;
  delay?: number;
}

function keyBadge(g: MockGroup) {
  if (g.keyType === 'Jan') return { label: 'JAN', bg: T.greenBg, color: T.green, bd: T.greenBd };
  if (g.keyType === 'ProductNumber') return { label: `No.${g.keyValue}`, bg: T.accentBg, color: T.accent, bd: T.accentBd };
  const pct = typeof g.keyValue === 'number' ? `${(g.keyValue * 100).toFixed(0)}%` : '?';
  return { label: `유사도 ${pct}`, bg: '#f3f4f6', color: T.t3, bd: T.bd };
}

export const GroupCardMock: React.FC<Props> = ({ group, frame, delay = 0 }) => {
  const localFrame = Math.max(0, frame - delay);
  const opacity = interpolate(localFrame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(localFrame, [0, 16], [12, 0], { extrapolateRight: 'clamp' });

  const rep = group.items[0];
  const available = group.items.filter(p => !p.isSoldOut);
  const minPrice = available.length > 0
    ? Math.min(...available.map(p => p.price))
    : null;
  const badge = keyBadge(group);

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: T.surface,
      border: `1px solid ${T.bd}`,
      borderRadius: T.r,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      opacity,
      transform: `translateY(${y}px)`,
    }}>
      {/* Image */}
      <div style={{
        width: 90, flexShrink: 0,
        background: `linear-gradient(135deg, ${rep.color}cc, ${rep.color}44)`,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FigureIcon color={rep.color} />
        <div style={{
          position: 'absolute', bottom: 5, left: 5,
          fontSize: 8, fontWeight: 700,
          padding: '2px 5px',
          borderRadius: 3,
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.bd}`,
          fontFamily: FONT_MONO,
          letterSpacing: 0.3,
        }}>
          {badge.label}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '10px 14px', fontFamily: FONT, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: T.t1,
          margin: 0, marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {group.label ?? rep.name}
        </p>
        {minPrice !== null && (
          <p style={{ fontSize: 10, color: T.t3, fontFamily: FONT_MONO, margin: 0, marginBottom: 8 }}>
            최저 <strong style={{ color: T.price, fontSize: 11 }}>₩{minPrice.toLocaleString()}</strong>
            {available.length < group.items.length && ` · ${group.items.length - available.length}개 품절`}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {group.items.slice(0, 4).map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '3px 6px', margin: '0 -6px',
              borderRadius: T.r2,
              borderBottom: i < group.items.length - 1 ? `1px solid ${T.s2}` : 'none',
              opacity: item.isSoldOut ? 0.5 : 1,
            }}>
              <span style={{ flex: 1, fontSize: 10.5, color: T.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.shop}
              </span>
              {item.isSoldOut ? (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: T.t3,
                  background: T.s2, border: `1px solid ${T.bd}`,
                  borderRadius: 3, padding: '1px 5px',
                }}>품절</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: T.price, fontFamily: FONT_MONO, flexShrink: 0 }}>
                  ₩{item.price.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FigureIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none" opacity={0.85}>
    <rect x="10" y="32" width="28" height="10" rx="2" fill={color} fillOpacity="0.5" />
    <rect x="14" y="26" width="20" height="8" rx="2" fill={color} fillOpacity="0.7" />
    <circle cx="24" cy="18" r="8" fill={color} />
    <circle cx="24" cy="18" r="4" fill="white" fillOpacity="0.3" />
  </svg>
);
