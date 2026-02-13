'use client';

import React, { useMemo } from 'react';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import { BoardDetails, BoardName } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import BoardRenderer from '../board-renderer/board-renderer';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { StoredBoardConfig } from '@/app/lib/saved-boards-db';
import type { UserBoard } from '@boardsesh/shared-schema';
import styles from './board-scroll.module.css';

const BOARD_TYPE_LABELS: Record<string, string> = {
  kilter: 'Kilter',
  tension: 'Tension',
  moonboard: 'MoonBoard',
  decoy: 'Decoy',
  touchstone: 'Touchstone',
  grasshopper: 'Grasshopper',
  soill: 'So iLL',
};

interface BoardScrollCardProps {
  userBoard?: UserBoard;
  storedConfig?: StoredBoardConfig;
  boardConfigs?: BoardConfigData;
  selected?: boolean;
  size?: 'default' | 'small';
  onClick: () => void;
}

export default function BoardScrollCard({
  userBoard,
  storedConfig,
  boardConfigs,
  selected,
  size = 'default',
  onClick,
}: BoardScrollCardProps) {
  const { boardDetails, name, meta } = useMemo(() => {
    let details: BoardDetails | null = null;
    let cardName = '';
    let cardMeta = '';

    try {
      if (userBoard) {
        const setIds = userBoard.setIds.split(',').map(Number);
        const boardName = userBoard.boardType as BoardName;
        cardName = userBoard.name;
        cardMeta = BOARD_TYPE_LABELS[userBoard.boardType] || userBoard.boardType;
        if (userBoard.locationName) {
          cardMeta += ` \u00B7 ${userBoard.locationName}`;
        }

        if (boardName === 'moonboard') {
          details = getMoonBoardDetails({
            layout_id: userBoard.layoutId,
            set_ids: setIds,
          }) as BoardDetails;
        } else {
          details = getBoardDetails({
            board_name: boardName,
            layout_id: userBoard.layoutId,
            size_id: userBoard.sizeId,
            set_ids: setIds,
          });
        }
      } else if (storedConfig) {
        cardName = storedConfig.name;

        // Derive meta from boardConfigs if available
        if (boardConfigs) {
          const layouts = boardConfigs.layouts[storedConfig.board] || [];
          const layout = layouts.find((l) => l.id === storedConfig.layoutId);
          cardMeta = layout?.name || (storedConfig.board.charAt(0).toUpperCase() + storedConfig.board.slice(1));
        } else {
          cardMeta = storedConfig.board.charAt(0).toUpperCase() + storedConfig.board.slice(1);
        }
        cardMeta += ` \u00B7 ${storedConfig.angle}\u00B0`;

        if (storedConfig.board === 'moonboard') {
          details = getMoonBoardDetails({
            layout_id: storedConfig.layoutId,
            set_ids: storedConfig.setIds,
          }) as BoardDetails;
        } else {
          details = getBoardDetails({
            board_name: storedConfig.board,
            layout_id: storedConfig.layoutId,
            size_id: storedConfig.sizeId,
            set_ids: storedConfig.setIds,
          });
        }
      }
    } catch {
      // Fall back to icon if board details unavailable
    }

    return { boardDetails: details, name: cardName, meta: cardMeta };
  }, [userBoard, storedConfig, boardConfigs]);

  const isSmall = size === 'small';
  const iconSize = isSmall ? 24 : 32;

  return (
    <div className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''}`} onClick={onClick}>
      <div
        className={`${styles.cardSquare} ${selected ? styles.cardSquareSelected : ''}`}
      >
        {boardDetails ? (
          <BoardRenderer
            litUpHoldsMap={{}}
            mirrored={false}
            boardDetails={boardDetails}
            thumbnail
            fillHeight
          />
        ) : (
          <div className={styles.cardFallback}>
            <DashboardOutlined sx={{ fontSize: iconSize }} />
          </div>
        )}
      </div>
      <div className={`${styles.cardName} ${selected ? styles.cardNameSelected : ''}`}>
        {name}
      </div>
      {meta && <div className={styles.cardMeta}>{meta}</div>}
    </div>
  );
}
