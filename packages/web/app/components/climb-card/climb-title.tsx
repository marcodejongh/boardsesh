'use client';

import React from 'react';
import { Flex, Typography } from 'antd';
import { CopyrightOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';

const { Text } = Typography;

export type ClimbTitleData = {
  name?: string;
  difficulty?: string | null;
  quality_average?: string | null;
  benchmark_difficulty?: string | null;
  angle?: number | string;
  setter_username?: string;
  ascensionist_count?: number;
};

type ClimbTitleProps = {
  climb?: ClimbTitleData | null;
  /** Show angle after difficulty/quality */
  showAngle?: boolean;
  /** Show setter and ascent count */
  showSetterInfo?: boolean;
  /** Custom element to render after the name (e.g., AscentStatus) */
  nameAddon?: React.ReactNode;
  /** Use ellipsis for text overflow */
  ellipsis?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Layout mode: 'stacked' (default) puts grade below name, 'horizontal' puts grade beside name */
  layout?: 'stacked' | 'horizontal';
};

/**
 * Reusable component for displaying climb title and info consistently across the app.
 * Used in ClimbCard, QueueControlBar, QueueListItem, and suggested items.
 */
const ClimbTitle: React.FC<ClimbTitleProps> = ({
  climb,
  showAngle = false,
  showSetterInfo = false,
  nameAddon,
  ellipsis = true,
  className,
  layout = 'stacked',
}) => {
  if (!climb) {
    return (
      <Text
        style={{
          fontSize: themeTokens.typography.fontSize.sm,
          fontWeight: themeTokens.typography.fontWeight.bold,
        }}
      >
        No climb selected
      </Text>
    );
  }

  const hasGrade = climb.difficulty && climb.quality_average && climb.quality_average !== '0';
  const isBenchmark = climb.benchmark_difficulty !== null && climb.benchmark_difficulty !== undefined;

  const textOverflowStyles = ellipsis
    ? {
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
      }
    : {};

  const renderDifficultyText = () => {
    if (hasGrade) {
      const baseText = `${climb.difficulty} ${climb.quality_average}★`;
      return showAngle ? `${baseText} @ ${climb.angle}°` : baseText;
    }
    const projectText = showAngle ? `project @ ${climb.angle}°` : 'project';
    return <span style={{ fontStyle: 'italic' }}>{projectText}</span>;
  };

  const nameElement = (
    <Text
      style={{
        fontSize: themeTokens.typography.fontSize.sm,
        fontWeight: themeTokens.typography.fontWeight.bold,
        ...textOverflowStyles,
      }}
    >
      {climb.name}
      {isBenchmark && (
        <CopyrightOutlined
          style={{
            marginLeft: 4,
            fontSize: themeTokens.typography.fontSize.xs,
            color: themeTokens.colors.primary,
          }}
        />
      )}
    </Text>
  );

  const gradeElement = (
    <Text
      type="secondary"
      style={{
        fontSize: themeTokens.typography.fontSize.xs,
        color: themeTokens.neutral[500],
        ...textOverflowStyles,
      }}
    >
      {renderDifficultyText()}
    </Text>
  );

  const setterElement = showSetterInfo && climb.setter_username && (
    <Text
      type="secondary"
      style={{
        fontSize: themeTokens.typography.fontSize.xs,
        fontWeight: themeTokens.typography.fontWeight.normal,
        ...textOverflowStyles,
      }}
    >
      By {climb.setter_username} - {climb.ascensionist_count ?? 0} ascents
    </Text>
  );

  if (layout === 'horizontal') {
    return (
      <Flex vertical gap={0} className={className}>
        {/* Row 1: Name (left) with addon, Grade (right) */}
        <Flex justify="space-between" align="center">
          <div style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[2] }}>
            {nameElement}
            {nameAddon}
          </div>
          {gradeElement}
        </Flex>
        {/* Row 2 (optional): Setter info */}
        {setterElement}
      </Flex>
    );
  }

  return (
    <Flex vertical gap={2} className={className}>
      {/* Row 1: Name with optional benchmark icon and addon (e.g., AscentStatus) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[2] }}>
        {nameElement}
        {nameAddon}
      </div>
      {/* Row 2: Difficulty/Quality and optional Angle */}
      {gradeElement}
      {/* Row 3 (optional): Setter info */}
      {setterElement}
    </Flex>
  );
};

export default ClimbTitle;
