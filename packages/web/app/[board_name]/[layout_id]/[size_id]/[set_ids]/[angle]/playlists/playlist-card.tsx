'use client';

import React from 'react';
import { LabelOutlined, FavoriteOutlined } from '@mui/icons-material';
import { SvgIconComponent } from '@mui/icons-material';
import Link from 'next/link';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './library.module.css';

const PLAYLIST_COLORS = [
  themeTokens.colors.primary,
  themeTokens.colors.logoGreen,
  themeTokens.colors.purple,
  themeTokens.colors.warning,
  themeTokens.colors.pink,
  themeTokens.colors.success,
  themeTokens.colors.logoRose,
  themeTokens.colors.amber,
];

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

export type PlaylistCardProps = {
  name: string;
  climbCount: number;
  color?: string;
  icon?: SvgIconComponent;
  href: string;
  variant: 'grid' | 'scroll';
  index?: number;
  isLikedClimbs?: boolean;
};

export default function PlaylistCard({
  name,
  climbCount,
  color,
  icon: IconComponent,
  href,
  variant,
  index = 0,
  isLikedClimbs,
}: PlaylistCardProps) {
  const backgroundColor = isLikedClimbs
    ? undefined
    : color && isValidHexColor(color)
      ? color
      : PLAYLIST_COLORS[index % PLAYLIST_COLORS.length];

  const Icon = isLikedClimbs
    ? FavoriteOutlined
    : IconComponent ?? LabelOutlined;

  if (variant === 'grid') {
    return (
      <Link href={href} className={styles.cardCompact}>
        <div
          className={`${styles.cardCompactSquare} ${isLikedClimbs ? styles.likedGradient : ''}`}
          style={!isLikedClimbs ? { backgroundColor } : undefined}
        >
          <Icon className={styles.cardCompactIcon} />
        </div>
        <div className={styles.cardCompactInfo}>
          <div className={styles.cardCompactName}>{name}</div>
          <div className={styles.cardMeta}>
            {climbCount} {climbCount === 1 ? 'climb' : 'climbs'}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`${styles.card} ${styles.cardScroll}`}
    >
      <div
        className={`${styles.cardSquare} ${isLikedClimbs ? styles.likedGradient : ''}`}
        style={!isLikedClimbs ? { backgroundColor } : undefined}
      >
        <Icon className={styles.cardIcon} />
      </div>
      <div className={styles.cardName}>{name}</div>
      <div className={styles.cardMeta}>
        {climbCount} {climbCount === 1 ? 'climb' : 'climbs'}
      </div>
    </Link>
  );
}
