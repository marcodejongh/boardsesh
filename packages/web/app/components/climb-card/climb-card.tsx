'use client';

import React from 'react';
import Card from 'antd/es/card';
import Flex from 'antd/es/flex';
import Typography from 'antd/es/typography';
import { CopyrightOutlined } from '@ant-design/icons';

import ClimbCardCover from './climb-card-cover';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';
import { themeTokens } from '@/app/theme/theme-config';

const { Text } = Typography;

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
    <Flex vertical gap={0}>
      {/* Row 1: Name, Benchmark | Difficulty, Quality */}
      <Flex justify="space-between" align="center">
        <Text strong style={{ fontSize: themeTokens.typography.fontSize.sm }}>
          {climb.name}
          {climb.benchmark_difficulty !== null && (
            <CopyrightOutlined style={{ marginLeft: 4, fontSize: themeTokens.typography.fontSize.xs, color: themeTokens.colors.primary }} />
          )}
        </Text>
        <Text strong type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
          {climb.difficulty && climb.quality_average && climb.quality_average !== '0' ? (
            `${climb.difficulty} ★${climb.quality_average}`
          ) : (
            <Text italic type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
              project
            </Text>
          )}
        </Text>
      </Flex>
      {/* Row 2: Setter and ascent count */}
      <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.xs, fontWeight: themeTokens.typography.fontWeight.normal }}>
        By {climb.setter_username} - {climb.ascensionist_count} ascents
      </Text>
    </Flex>
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
      styles={{ header: { paddingTop: 8, paddingBottom: 6 }, body: { padding: 8 } }}
      actions={actions || ClimbCardActions({ climb, boardDetails })}
    >
      {cover}
    </Card>
  );
};

export default ClimbCard;
