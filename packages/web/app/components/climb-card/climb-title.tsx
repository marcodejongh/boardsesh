'use client';

import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CopyrightOutlined from '@mui/icons-material/CopyrightOutlined';
import { themeTokens } from '@/app/theme/theme-config';
import { getSoftVGradeColor } from '@/app/lib/grade-colors';

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
  /** Custom element to render on the far right (e.g., AscentStatus in play view) */
  rightAddon?: React.ReactNode;
  /** Use ellipsis for text overflow */
  ellipsis?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Layout mode: 'stacked' (default) puts grade below name, 'horizontal' puts grade beside name */
  layout?: 'stacked' | 'horizontal';
  /** Center the content (useful for QueueControlBar) */
  centered?: boolean;
  /** Font size for the climb name. Use a design token, e.g. themeTokens.typography.fontSize.lg */
  titleFontSize?: number;
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
  rightAddon,
  ellipsis = true,
  className,
  layout = 'stacked',
  centered = false,
  titleFontSize,
}) => {
  if (!climb) {
    return (
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontSize: themeTokens.typography.fontSize.sm,
          fontWeight: themeTokens.typography.fontWeight.bold,
        }}
      >
        No climb selected
      </Typography>
    );
  }

  const hasGrade = climb.difficulty && climb.quality_average && climb.quality_average !== '0';
  // A climb is a benchmark/classic if benchmark_difficulty has a meaningful value (not null, undefined, empty, or "0")
  const isBenchmark =
    climb.benchmark_difficulty !== null &&
    climb.benchmark_difficulty !== undefined &&
    climb.benchmark_difficulty !== '' &&
    climb.benchmark_difficulty !== '0';

  // Extract V grade from difficulty string (e.g., "6a/V3" -> "V3", "V5" -> "V5")
  const getVGrade = (difficulty: string): string | null => {
    const vGradeMatch = difficulty.match(/V\d+/i);
    return vGradeMatch ? vGradeMatch[0].toUpperCase() : null;
  };

  const vGrade = climb.difficulty ? getVGrade(climb.difficulty) : null;

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
    return <Box component="span" sx={{ fontStyle: 'italic' }}>{projectText}</Box>;
  };

  const nameFontSize = titleFontSize ?? themeTokens.typography.fontSize.sm;

  const nameElement = (
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontSize: nameFontSize,
        fontWeight: themeTokens.typography.fontWeight.bold,
        ...textOverflowStyles,
      }}
    >
      {climb.name}
      {isBenchmark && (
        <CopyrightOutlined
          sx={{
            marginLeft: '4px',
            fontSize: themeTokens.typography.fontSize.xs,
            color: themeTokens.colors.primary,
          }}
        />
      )}
    </Typography>
  );

  const gradeElement = (
    <Typography
      variant="body2"
      component="span"
      color="text.secondary"
      sx={{
        fontSize: themeTokens.typography.fontSize.xs,
        fontWeight: themeTokens.typography.fontWeight.normal,
        ...textOverflowStyles,
      }}
    >
      {renderDifficultyText()}
    </Typography>
  );

  const gradeColor = vGrade ? getSoftVGradeColor(vGrade) : undefined;

  const largeGradeElement = vGrade && (
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontSize: nameFontSize,
        fontWeight: themeTokens.typography.fontWeight.bold,
        lineHeight: 1,
        color: gradeColor ?? 'text.secondary',
      }}
    >
      {vGrade}
    </Typography>
  );

  const setterElement = showSetterInfo && climb.setter_username && (
    <Typography
      variant="body2"
      component="span"
      color="text.secondary"
      sx={{
        fontSize: themeTokens.typography.fontSize.xs,
        fontWeight: themeTokens.typography.fontWeight.normal,
        ...textOverflowStyles,
      }}
    >
      By {climb.setter_username} - {climb.ascensionist_count ?? 0} ascents
    </Typography>
  );

  if (layout === 'horizontal') {
    const secondLineContent = [];
    if (hasGrade) {
      secondLineContent.push(`${climb.difficulty} ${climb.quality_average}★`);
    }
    if (showSetterInfo && climb.setter_username) {
      secondLineContent.push(`${climb.setter_username}`);
    }
    if (climb.ascensionist_count !== undefined) {
      secondLineContent.push(`${climb.ascensionist_count} ascents`);
    }

    return (
      <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center', ...(centered ? { position: 'relative' } : {}) }} className={className}>
        {/* Colorized V grade on the left */}
        {largeGradeElement}
        {/* Center: Name and quality/setter stacked */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, minWidth: 0, alignItems: centered ? 'center' : 'flex-start' }}>
          {/* Row 1: Name with addon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${themeTokens.spacing[2]}px` }}>
            {nameElement}
            {nameAddon}
          </Box>
          {/* Row 2: Quality, setter, ascents */}
          <Typography
            variant="body2"
            component="span"
            color="text.secondary"
            sx={{
              fontSize: themeTokens.typography.fontSize.xs,
              fontWeight: themeTokens.typography.fontWeight.normal,
              ...textOverflowStyles,
            }}
          >
            {secondLineContent.length > 0 ? secondLineContent.join(' · ') : <Box component="span" sx={{ fontStyle: 'italic' }}>project</Box>}
          </Typography>
        </Box>
        {/* Right addon (e.g., ascent status) */}
        {rightAddon}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: centered ? 'center' : 'flex-start' }} className={className}>
      {/* Row 1: Name with optional benchmark icon and addon (e.g., AscentStatus) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${themeTokens.spacing[2]}px` }}>
        {nameElement}
        {nameAddon}
      </Box>
      {/* Row 2: Difficulty/Quality and optional Angle */}
      {gradeElement}
      {/* Row 3 (optional): Setter info */}
      {setterElement}
    </Box>
  );
};

export default ClimbTitle;
