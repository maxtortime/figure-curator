import React from 'react';
import { interpolate } from 'remotion';
import { T, FONT, FONT_MONO, W, H } from '../tokens';

interface Props {
  frame: number;
  headline: string;
  sub?: string;
  videoNum?: string;
}

export const TitleSlate: React.FC<Props> = ({ frame, headline, sub, videoNum }) => {
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 25], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 100,
      opacity,
      transform: `translateY(${y}px)`,
      pointerEvents: 'none',
    }}>
      {videoNum && (
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          {videoNum}
        </div>
      )}

      <h2 style={{
        fontFamily: FONT,
        fontSize: 48,
        fontWeight: 700,
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: -1,
        margin: 0,
        padding: '0 40px',
      }}>
        {headline}
      </h2>

      {sub && (
        <p style={{
          fontFamily: FONT,
          fontSize: 20,
          color: 'rgba(255,255,255,0.55)',
          marginTop: 14,
          textAlign: 'center',
          padding: '0 60px',
          lineHeight: 1.5,
        }}>
          {sub}
        </p>
      )}

      <div style={{
        marginTop: 32,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: T.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: FONT }}>FC</span>
        </div>
        <span style={{
          fontFamily: FONT,
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
        }}>
          Figure Curator
        </span>
      </div>
    </div>
  );
};
