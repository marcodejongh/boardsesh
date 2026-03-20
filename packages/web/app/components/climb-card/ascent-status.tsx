'use client';

import React, { useMemo } from 'react';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { ClimbUuid } from '@/app/lib/types';
import { useOptionalBoardProvider } from '../board-provider/board-provider-context';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './ascent-status.module.css';

export const AscentStatus = ({ climbUuid, fontSize }: { climbUuid: ClimbUuid; fontSize?: number }) => {
  const boardProvider = useOptionalBoardProvider();
  const logbook = boardProvider?.logbook ?? [];
  const boardName = boardProvider?.boardName ?? 'kilter';

  const ascentsForClimb = useMemo(
    () => logbook.filter((ascent) => ascent.climb_uuid === climbUuid),
    [logbook, climbUuid],
  );

  const hasSuccessfulAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && !is_mirror);
  const hasSuccessfulMirroredAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && is_mirror);
  const hasAttempts = ascentsForClimb.length > 0;
  const supportsMirroring = boardName === 'tension';

  if (!hasAttempts) return null;

  if (supportsMirroring) {
    return (
      <div className={styles.ascentStatusContainer}>
        {/* Regular ascent icon */}
        {hasSuccessfulAscent ? (
          <div className={styles.ascentIconRegular}>
            <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
          </div>
        ) : null}
        {/* Mirrored ascent icon */}
        {hasSuccessfulMirroredAscent ? (
          <div className={styles.ascentIconMirrored}>
            <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
          </div>
        ) : null}
        {!hasSuccessfulMirroredAscent && !hasSuccessfulAscent ? (
          <CloseOutlined className={styles.ascentIconRegular} style={{ color: themeTokens.colors.error, fontSize }} />
        ) : null}
      </div>
    );
  }

  // Single icon for non-mirroring boards
  return hasSuccessfulAscent ? (
    <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
  ) : (
    <CloseOutlined style={{ color: themeTokens.colors.error, fontSize }} />
  );
};
