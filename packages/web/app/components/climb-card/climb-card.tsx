'use client';

import React from 'react';
import Card from 'antd/es/card';
import { CopyrightOutlined } from '@ant-design/icons';

import ClimbCardCover from './climb-card-cover';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';
import { themeTokens } from '@/app/theme/theme-config';

type ClimbCardProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
};

const ClimbCard = ({ climb, boardDetails, onCoverClick, selected, actions }: ClimbCardProps) => {
  const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} />;

  const cardTitle = climb ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* LEFT: Name, Angle, Benchmark */}
      <div style={{ fontWeight: themeTokens.typography.fontWeight.semibold }}>
        {climb.name} @ {climb.angle}°
        {climb.benchmark_difficulty !== null && (
          <CopyrightOutlined style={{ marginLeft: 4, color: themeTokens.colors.primary }} />
        )}
      </div>

      {/* RIGHT: Difficulty, Quality */}
      <div style={{ color: themeTokens.neutral[600] }}>
        {climb.difficulty && climb.quality_average && climb.quality_average !== '0' ? (
          `${climb.difficulty} ★${climb.quality_average}`
        ) : (
          <span style={{ fontWeight: 400, fontStyle: 'italic', color: themeTokens.neutral[400] }}>
            project
          </span>
        )}
      </div>
    </div>
  ) : (
    'Loading...'
  );

  return (
    <Card
      title={cardTitle}
      size="small"
      style={{
        backgroundColor: selected ? themeTokens.semantic.selected : themeTokens.semantic.surface,
        borderColor: selected ? themeTokens.colors.primary : undefined,
      }}
      actions={actions || ClimbCardActions({ climb, boardDetails })}
    >
      <div style={{ color: themeTokens.neutral[500], fontSize: themeTokens.typography.fontSize.sm }}>
        {climb ? `By ${climb.setter_username} - ${climb.ascensionist_count} ascents` : null}
      </div>
      {cover}
    </Card>
  );
};

export default ClimbCard;
