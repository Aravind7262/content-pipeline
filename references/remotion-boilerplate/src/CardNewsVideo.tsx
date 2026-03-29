import React from "react";
import {
  AbsoluteFill,
  Audio,
  Series,
  staticFile,
} from "remotion";
import {CARD_COMPONENTS} from "./cards";
import {CARD_DURATIONS} from "./data";
import {SubtitleOverlay} from "./SubtitleOverlay";

interface CardNewsVideoProps {
  cardDurations?: number[];
  showSubtitles?: boolean;
}

export const CardNewsVideo: React.FC<CardNewsVideoProps> = ({
  cardDurations = CARD_DURATIONS,
  showSubtitles = true,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {cardDurations.map((durationInFrames, index) => {
          const CardComponent = CARD_COMPONENTS[index];
          const audioNum = String(index + 1).padStart(2, "0");
          return (
            <Series.Sequence key={index} durationInFrames={durationInFrames}>
              <Audio src={staticFile(`card-${audioNum}.mp3`)} />
              <CardComponent durationInFrames={durationInFrames} />
            </Series.Sequence>
          );
        })}
      </Series>

      {showSubtitles ? <SubtitleOverlay bottom={96} maxWidth={920} /> : null}
    </AbsoluteFill>
  );
};
