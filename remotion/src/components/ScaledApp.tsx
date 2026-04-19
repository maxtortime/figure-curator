/**
 * Wraps AppWindow so it fills the 1080px canvas width exactly (scale 1.08).
 * Content area minHeight is set per-video to push the app to ~60% of canvas height.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { APP_SCALE, APP_TOP, FONT } from '../tokens';
import { AppWindow } from './AppWindow';

interface Props {
  frame: number;
  searchValue?: string;
  showCursor?: boolean;
  contentHeight?: number;
  children: React.ReactNode;
}

export const ScaledApp: React.FC<Props> = ({
  frame,
  searchValue,
  showCursor,
  contentHeight = 900,
  children,
}) => {
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const y       = interpolate(frame, [0, 40], [22, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      top: APP_TOP,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      opacity,
      transform: `translateY(${y}px)`,
    }}>
      <div style={{
        width: 1000,
        transform: `scale(${APP_SCALE})`,
        transformOrigin: 'top center',
      }}>
        <AppWindow searchValue={searchValue} showCursor={showCursor}>
          <div style={{ minHeight: contentHeight, fontFamily: FONT }}>
            {children}
          </div>
        </AppWindow>
      </div>
    </div>
  );
};
