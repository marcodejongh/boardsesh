'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { Proposal } from '@boardsesh/shared-schema';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getDefaultBoardConfig } from '@/app/lib/default-board-configs';
import { constructClimbViewUrlWithSlugs, constructClimbViewUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import type { BoardDetails, BoardName } from '@/app/lib/types';

interface ProposalClimbPreviewProps {
  proposal: Proposal;
}

export default function ProposalClimbPreview({ proposal }: ProposalClimbPreviewProps) {
  const { climbName, frames, layoutId, boardType, climbUuid, angle } = proposal;

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
    } catch {
      return null;
    }
  }, [boardType, layoutId]);

  const litUpHoldsMap = useMemo(() => {
    if (!frames || !boardType) return undefined;
    const framesData = convertLitUpHoldsStringToMap(frames, boardType as BoardName);
    return framesData[0];
  }, [frames, boardType]);

  const climbViewPath = useMemo(() => {
    if (!layoutId || !angle) return null;

    const boardName = boardType as BoardName;
    const config = getDefaultBoardConfig(boardName, layoutId);
    if (!config) return null;

    try {
      const details = getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
      if (details?.layout_name && details.size_name && details.set_names) {
        return constructClimbViewUrlWithSlugs(
          details.board_name,
          details.layout_name,
          details.size_name,
          details.size_description,
          details.set_names,
          angle,
          climbUuid,
          climbName || undefined,
        );
      }

      return constructClimbViewUrl(
        {
          board_name: boardName,
          layout_id: layoutId,
          size_id: config.sizeId,
          set_ids: config.setIds,
          angle,
        },
        climbUuid,
        climbName || undefined,
      );
    } catch {
      return null;
    }
  }, [boardType, layoutId, angle, climbUuid, climbName]);

  // Don't render if we have no climb data
  if (!climbName && !frames) return null;

  const previewContent = (
    <Box
      data-testid="proposal-climb-preview"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1.5,
        p: 1,
        borderRadius: 1,
        bgcolor: themeTokens.neutral[50],
        cursor: climbViewPath ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease',
        '&:hover': climbViewPath ? { bgcolor: themeTokens.neutral[100] } : undefined,
      }}
    >
      {/* Board thumbnail */}
      {boardDetails && litUpHoldsMap && (
        <Box
          data-testid="proposal-climb-thumbnail"
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: 0.5,
            overflow: 'hidden',
            bgcolor: themeTokens.neutral[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': {
              width: '100%',
              height: '100%',
              maxHeight: 'none',
            },
          }}
        >
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={litUpHoldsMap}
            mirrored={false}
            thumbnail
          />
        </Box>
      )}

      {/* Climb info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {climbName && (
          <Typography
            variant="body2"
            data-testid="proposal-climb-name"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: themeTokens.neutral[800],
            }}
          >
            {climbName}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: themeTokens.neutral[500], textTransform: 'capitalize' }}>
            {boardType}
          </Typography>
          {angle != null && (
            <Chip
              label={`${angle}\u00B0`}
              size="small"
              data-testid="proposal-climb-angle"
              sx={{
                height: 18,
                fontSize: 11,
                bgcolor: themeTokens.neutral[200],
                color: themeTokens.neutral[600],
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  if (climbViewPath) {
    return (
      <Link
        href={climbViewPath}
        data-testid="proposal-climb-link"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {previewContent}
      </Link>
    );
  }

  return previewContent;
}
