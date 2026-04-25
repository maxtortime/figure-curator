/**
 * Video 03 — 자동 그룹화
 *
 * Timeline (30fps, 570 frames = 19s):
 *   0–40   App in (results list view)
 *  40–120  "그룹" 탭 클릭 → view toggle 하이라이트
 * 120–300  3개 그룹 순서대로 등장 (JAN → No. → 유사도)
 * 300–420  첫 번째 그룹(JAN) hover → 샵 행 확장
 * 420–510  그룹별 최저가 badge 강조
 * 510–570  Title slate
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT, FONT_MONO } from '../tokens';
import { AppWindow } from '../components/AppWindow';
import { GroupCardMock } from '../components/GroupCardMock';
import { TitleSlate } from '../components/TitleSlate';
import { GROUPS } from '../data/mock';

const TOGGLE_FRAME = 80;
const GROUP_START  = 130;
const TITLE_FRAME  = 510;

export const Groups03: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const winY       = interpolate(frame, [0, 40], [20, 0], { extrapolateRight: 'clamp' });

  const isGrouped  = frame >= TOGGLE_FRAME;
  const showTitle  = frame >= TITLE_FRAME;

  const groupVisibleCount = Math.floor(
    interpolate(frame, [GROUP_START, GROUP_START + GROUPS.length * 50], [0, GROUPS.length], {
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
            {/* Statusbar with view toggle */}
            <StatusBar isGrouped={isGrouped} frame={frame} />

            {isGrouped ? (
              <div style={{ padding: '0 20px 20px' }}>
                <SectionTitle count={GROUPS.length} label="그룹화된 상품" frame={frame} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {GROUPS.slice(0, groupVisibleCount).map((g, i) => (
                    <GroupCardMock
                      key={i}
                      group={g}
                      frame={frame - GROUP_START - i * 50}
                      delay={0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ListPlaceholder frame={frame} fps={fps} />
            )}
          </div>
        </AppWindow>
      </div>

      {showTitle && (
        <TitleSlate
          frame={frame - TITLE_FRAME}
          headline="같은 상품, 자동 그룹화"
          sub="JAN 코드 · 품번 · 텍스트 유사도로 3단계 분류"
          videoNum="03 · 자동 그룹화"
        />
      )}
    </AbsoluteFill>
  );
};

const StatusBar: React.FC<{ isGrouped: boolean; frame: number }> = ({ isGrouped, frame }) => {
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      padding: '12px 20px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${T.bd}`, marginBottom: 16,
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
              boxShadow: active && i === 1 ? `0 0 0 3px ${T.accentBg}` : 'none',
              transition: 'all 0.2s',
            }}>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ count: number; label: string; frame: number }> = ({ count, label, frame }) => {
  const opacity = interpolate(frame, [GROUP_START - 10, GROUP_START + 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 10, opacity,
      fontSize: 11, fontWeight: 600, color: T.t3,
      letterSpacing: 1, textTransform: 'uppercase' as const,
      fontFamily: FONT,
    }}>
      {label}
      <span style={{
        fontFamily: FONT_MONO, fontSize: 10,
        background: T.s2, border: `1px solid ${T.bd}`,
        borderRadius: 999, padding: '1px 7px', color: T.t3,
      }}>
        {count}
      </span>
    </div>
  );
};

const ListPlaceholder: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(frame, [5, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 10, padding: '0 20px 20px', opacity,
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          background: T.surface, border: `1px solid ${T.bd}`,
          borderRadius: T.r, overflow: 'hidden', opacity: 0.7,
        }}>
          <div style={{ aspectRatio: '1', background: T.s2 }} />
          <div style={{ padding: 10 }}>
            <div style={{ height: 10, background: T.s2, borderRadius: 3, marginBottom: 5 }} />
            <div style={{ height: 10, background: T.s2, borderRadius: 3, width: '60%' }} />
          </div>
        </div>
      ))}
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
          자동 그룹화
        </span>
      </div>
    </div>
  );
};
