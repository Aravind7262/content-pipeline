// 카드 컴포넌트 템플릿 — 3가지 레이아웃 패턴
// 새 카드를 만들 때 이 파일을 복사해서 내용을 채운다.
// 패턴: FullBleed(이미지 풀블리드+텍스트 오버레이), Split(좌우 분할), TextOnly(텍스트 중심)

import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

const FADE_IN = 9;      // 0.3초 @ 30fps
const TITLE_IN = 15;    // 0.5초
const BODY_IN = 24;     // 0.8초
const FADE_OUT = 15;    // 0.5초

interface CardProps {
  durationInFrames: number;
}

// ─── 패턴 A: 풀블리드 (이미지 배경 + 텍스트 오버레이) ───
export const FullBleedCard: React.FC<CardProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const bgOpacity = interpolate(frame, [0, FADE_IN], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [TITLE_IN, TITLE_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [TITLE_IN, TITLE_IN + 12], [30, 0], { extrapolateRight: "clamp" });
  const bodyOpacity = interpolate(frame, [BODY_IN, BODY_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_OUT, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* 배경 이미지 */}
      <Img src={staticFile("card-XX.png")} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: bgOpacity }} />
      {/* 그라디언트 마스크 */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.8) 100%)" }} />
      {/* 텍스트 */}
      <div style={{ position: "absolute", bottom: 100, left: 70, right: 70 }}>
        <h2 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 52, color: "#FAFAFA", opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          제목
        </h2>
        <p style={{ fontSize: 20, color: "rgba(250,250,250,0.8)", lineHeight: 1.7, opacity: bodyOpacity }}>
          설명 텍스트
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ─── 패턴 B: 스플릿 (좌우 분할) ───
export const SplitCard: React.FC<CardProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [TITLE_IN, TITLE_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const bodyOpacity = interpolate(frame, [BODY_IN, BODY_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_OUT, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", opacity: fadeOut }}>
      {/* 텍스트 영역 (45%) */}
      <div style={{ width: "45%", height: "100%", padding: "80px 50px", display: "flex", flexDirection: "column", justifyContent: "center", background: "#FAFAFA" }}>
        <h2 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 40, color: "#0A0A0A", opacity: titleOpacity }}>
          제목
        </h2>
        <p style={{ fontSize: 18, color: "#444", lineHeight: 1.8, opacity: bodyOpacity, marginTop: 24 }}>
          설명 텍스트
        </p>
      </div>
      {/* 이미지 영역 (55%) */}
      <div style={{ width: "55%", height: "100%", overflow: "hidden" }}>
        <Img src={staticFile("card-XX.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── 패턴 C: 텍스트 온리 (이미지 없을 때) ───
export const TextOnlyCard: React.FC<CardProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [TITLE_IN, TITLE_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [TITLE_IN, TITLE_IN + 12], [30, 0], { extrapolateRight: "clamp" });
  const bodyOpacity = interpolate(frame, [BODY_IN, BODY_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_OUT, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0A0A0A", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 80px", opacity: fadeOut }}>
      <h2 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 60, color: "#FAFAFA", textAlign: "center", opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        제목
      </h2>
      <p style={{ fontSize: 22, color: "rgba(250,250,250,0.7)", lineHeight: 1.8, textAlign: "center", marginTop: 32, opacity: bodyOpacity }}>
        설명 텍스트
      </p>
    </AbsoluteFill>
  );
};
