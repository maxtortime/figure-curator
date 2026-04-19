import React from 'react';
import { interpolate } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';

interface Props {
  shops: string[];
  doneCount: number;
  activeIndex: number;
}

export const ShopTicker: React.FC<Props> = ({ shops, doneCount, activeIndex }) => {
  const VISIBLE = 9;
  const scrollStart = Math.max(0, activeIndex - 5);
  const visible = shops.slice(scrollStart, scrollStart + VISIBLE);

  return (
    <div style={{ padding: '20px 24px 20px', fontFamily: FONT }}>
      {/* Status header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 16,
      }}>
        <Spinner />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
          {doneCount < shops.length
            ? `${shops.length}개 쇼핑몰 크롤링 중…`
            : '크롤링 완료'}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11, fontFamily: FONT_MONO,
          background: T.accentBg,
          border: `1px solid ${T.accentBd}`,
          borderRadius: 999,
          color: T.accent,
          padding: '2px 10px',
          fontWeight: 600,
        }}>
          {doneCount} / {shops.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3, background: T.s2, borderRadius: 2, marginBottom: 18,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${(doneCount / shops.length) * 100}%`,
          background: `linear-gradient(90deg, ${T.accent}, #60a5fa)`,
          borderRadius: 2,
          transition: 'width 0.1s',
        }} />
      </div>

      {/* Shop rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map((shop, localIdx) => {
          const globalIdx = scrollStart + localIdx;
          const isDone = globalIdx < doneCount;
          const isActive = globalIdx === activeIndex;
          const opacity = globalIdx > activeIndex + 1 ? 0.35 : 1;

          return (
            <div key={shop} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px',
              borderRadius: T.r2,
              background: isActive ? T.accentBg : 'transparent',
              border: `1px solid ${isActive ? T.accentBd : 'transparent'}`,
              opacity,
              transition: 'all 0.15s',
            }}>
              <div style={{ width: 18, flexShrink: 0, textAlign: 'center' }}>
                {isDone
                  ? <span style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>✓</span>
                  : isActive
                  ? <ActiveSpinner />
                  : <span style={{ color: T.t3, fontSize: 11 }}>·</span>
                }
              </div>
              <span style={{
                fontSize: 12.5,
                color: isDone ? T.t1 : isActive ? T.accent : T.t3,
                fontWeight: isActive ? 600 : 400,
                flex: 1,
              }}>
                {shop}
              </span>
              {isDone && (
                <span style={{
                  fontSize: 10, fontFamily: FONT_MONO,
                  color: T.t3,
                }}>
                  {3 + (globalIdx % 14)}개
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Spinner: React.FC = () => (
  <div style={{
    width: 14, height: 14,
    border: `2px solid ${T.accentBg}`,
    borderTopColor: T.accent,
    borderRadius: '50%',
    animation: 'spin 0.65s linear infinite',
    flexShrink: 0,
  }} />
);

const ActiveSpinner: React.FC = () => (
  <div style={{
    width: 10, height: 10,
    border: `1.5px solid ${T.accentBg}`,
    borderTopColor: T.accent,
    borderRadius: '50%',
    display: 'inline-block',
  }} />
);
