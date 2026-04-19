import React from 'react';
import { T, FONT } from '../tokens';

interface Props {
  searchValue?: string;
  showCursor?: boolean;
  children: React.ReactNode;
  width?: number;
}

export const AppWindow: React.FC<Props> = ({
  searchValue = '',
  showCursor = false,
  children,
  width = 1000,
}) => {
  const hasValue = searchValue.length > 0;

  return (
    <div style={{
      width,
      background: '#f4f6fb',
      borderRadius: T.rLg,
      overflow: 'hidden',
      boxShadow: '0 48px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
      fontFamily: FONT,
    }}>
      {/* Topbar */}
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderBottom: `1px solid ${T.bd}`,
        padding: '11px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
            <div key={i} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
        </div>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: -0.5 }}>FC</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.t1, whiteSpace: 'nowrap' }}>
            Figure Curator
          </span>
        </div>

        {/* Search bar */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: T.surface,
            border: `1px solid ${hasValue ? T.accent : T.bd}`,
            borderRadius: T.r,
            padding: '0 5px 0 11px',
            gap: 8,
            boxShadow: hasValue
              ? `0 0 0 3px ${T.accentBg}`
              : '0 1px 3px rgba(0,0,0,0.07)',
            transition: 'border-color 0.2s',
          }}>
            <SearchIcon color={hasValue ? T.accent : T.t3} />
            <span style={{
              flex: 1,
              fontSize: 13,
              color: hasValue ? T.t1 : T.t3,
              padding: '9px 0',
              fontFamily: FONT,
              minHeight: 38,
              display: 'flex',
              alignItems: 'center',
            }}>
              {hasValue ? searchValue : '넨도로이드, figma, 건담...'}
              {showCursor && hasValue && (
                <span style={{
                  display: 'inline-block',
                  width: 2, height: 14,
                  background: T.accent,
                  marginLeft: 2,
                  borderRadius: 1,
                }} />
              )}
            </span>
            {hasValue && (
              <div style={{
                background: T.accent,
                color: '#fff',
                borderRadius: T.r2,
                fontSize: 12, fontWeight: 600,
                padding: '5px 14px',
                flexShrink: 0,
                letterSpacing: 0.2,
              }}>
                검색
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
};

const SearchIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8.5" cy="8.5" r="5.5" stroke={color} strokeWidth="1.6" />
    <path d="M13 13l3.5 3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
