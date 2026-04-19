import React from 'react';
import { interpolate, spring } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { MockProduct } from '../data/mock';

interface Props {
  product: MockProduct;
  frame: number;
  fps: number;
  delay?: number;
}

export const ProductCardMock: React.FC<Props> = ({ product, frame, fps, delay = 0 }) => {
  const localFrame = Math.max(0, frame - delay);
  const opacity = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(localFrame, [0, 14], [10, 0], { extrapolateRight: 'clamp' });

  const priceFormatted = product.isSoldOut
    ? null
    : `₩${product.price.toLocaleString()}`;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.bd}`,
      borderRadius: T.r,
      overflow: 'hidden',
      opacity,
      transform: `translateY(${y}px)`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      {/* Image area */}
      <div style={{
        aspectRatio: '1',
        background: product.isSoldOut
          ? `${product.color}33`
          : `linear-gradient(135deg, ${product.color}cc, ${product.color}55)`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <FigureIcon color={product.color} soldOut={product.isSoldOut} />

        {product.isSoldOut && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.t2, fontFamily: FONT }}>품절</span>
          </div>
        )}

        {/* Shop badge */}
        <div style={{
          position: 'absolute', top: 7, left: 7,
          background: T.accent,
          color: '#fff',
          fontSize: 9, fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 999,
          fontFamily: FONT,
          maxWidth: 'calc(100% - 14px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {product.shop}
        </div>

        {/* JAN badge */}
        {product.jan && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: T.greenBg,
            border: `1px solid ${T.greenBd}`,
            borderRadius: 3,
            fontSize: 7.5,
            fontFamily: FONT_MONO,
            color: T.green,
            padding: '1px 5px',
            fontWeight: 600,
          }}>
            JAN
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '9px 11px 11px', fontFamily: FONT }}>
        <p style={{
          fontSize: 11,
          color: product.isSoldOut ? T.t3 : T.t1,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
          marginBottom: 7,
          minHeight: 30,
        }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
          {priceFormatted ? (
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: 12.5,
              fontWeight: 700,
              color: T.price,
              letterSpacing: -0.5,
            }}>
              {priceFormatted}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT }}>품절</span>
          )}
        </div>
      </div>
    </div>
  );
};

const FigureIcon: React.FC<{ color: string; soldOut: boolean }> = ({ color, soldOut }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={soldOut ? 0.4 : 0.9}>
    <rect x="10" y="32" width="28" height="10" rx="2" fill={color} fillOpacity="0.5" />
    <rect x="14" y="26" width="20" height="8" rx="2" fill={color} fillOpacity="0.7" />
    <circle cx="24" cy="18" r="8" fill={color} />
    <circle cx="24" cy="18" r="4" fill="white" fillOpacity="0.3" />
    <rect x="6" y="40" width="36" height="3" rx="1.5" fill={color} fillOpacity="0.3" />
  </svg>
);
