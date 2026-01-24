'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BoardDetails, BoardName } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getDefaultBoardConfig, getDefaultClimbViewPath } from '@/app/lib/default-board-configs';
import styles from './ascents-feed.module.css';

interface AscentThumbnailProps {
  boardType: string;
  layoutId: number | null;
  angle: number;
  climbUuid: string;
  climbName: string;
  frames: string | null;
  isMirror: boolean;
}

const AscentThumbnail: React.FC<AscentThumbnailProps> = ({
  boardType,
  layoutId,
  angle,
  climbUuid,
  climbName,
  frames,
  isMirror,
}) => {
  // Memoize board details to avoid recomputing on every render
  const boardDetails = useMemo<BoardDetails | null>(() => {
    if (!layoutId) return null;

    const boardName = boardType as BoardName;
    const config = getDefaultBoardConfig(boardName, layoutId);
    if (!config) return null;

    try {
      return getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
    } catch (error) {
      console.error('Failed to get board details for thumbnail:', error);
      return null;
    }
  }, [boardType, layoutId]);

  // Memoize lit up holds map
  const litUpHoldsMap = useMemo(() => {
    if (!frames || !boardType) return undefined;
    const framesData = convertLitUpHoldsStringToMap(frames, boardType as BoardName);
    return framesData[0];
  }, [frames, boardType]);

  // Get climb view path
  const climbViewPath = useMemo(() => {
    if (!layoutId) return null;
    return getDefaultClimbViewPath(boardType as BoardName, layoutId, angle, climbUuid);
  }, [boardType, layoutId, angle, climbUuid]);

  // If we can't render the thumbnail, don't show anything
  if (!boardDetails || !litUpHoldsMap || !climbViewPath) {
    return null;
  }

  return (
    <Link
      href={climbViewPath}
      className={styles.thumbnailLink}
      title={`View ${climbName}`}
    >
      <div className={styles.thumbnailContainer}>
        <BoardRenderer
          boardDetails={boardDetails}
          litUpHoldsMap={litUpHoldsMap}
          mirrored={isMirror}
          thumbnail
        />
      </div>
    </Link>
  );
};

export default AscentThumbnail;
