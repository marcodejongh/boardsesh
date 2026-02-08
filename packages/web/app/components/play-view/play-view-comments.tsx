'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { themeTokens } from '@/app/theme/theme-config';
import dayjs from 'dayjs';

interface PlayViewCommentsProps {
  climbUuid: string | undefined;
}

const PlayViewComments: React.FC<PlayViewCommentsProps> = ({ climbUuid }) => {
  const { logbook } = useBoardProvider();

  if (!climbUuid) return null;

  const ascents = logbook
    .filter((entry) => entry.climb_uuid === climbUuid)
    .sort((a, b) => dayjs(b.climbed_at).valueOf() - dayjs(a.climbed_at).valueOf());

  if (ascents.length === 0) return null;

  return (
    <Box sx={{ px: `${themeTokens.spacing[3]}px`, pb: `${themeTokens.spacing[2]}px` }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: `${themeTokens.spacing[1]}px`,
          fontWeight: themeTokens.typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: themeTokens.typography.fontSize.xs,
        }}
      >
        <ChatBubbleOutlineOutlined sx={{ fontSize: themeTokens.typography.fontSize.sm }} />
        Your Ascents ({ascents.length})
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${themeTokens.spacing[1]}px` }}>
        {ascents.map((ascent) => (
          <Box
            key={`${ascent.climb_uuid}-${ascent.climbed_at}`}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: `${themeTokens.spacing[2]}px`,
              py: `${themeTokens.spacing[1]}px`,
              borderBottom: `1px solid ${themeTokens.neutral[100]}`,
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            {/* Status icon */}
            <Box sx={{ pt: '2px', flexShrink: 0 }}>
              {ascent.is_ascent ? (
                <CheckOutlined sx={{ fontSize: themeTokens.typography.fontSize.base, color: themeTokens.colors.success }} />
              ) : (
                <CloseOutlined sx={{ fontSize: themeTokens.typography.fontSize.base, color: themeTokens.neutral[400] }} />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.xs }}>
                  {dayjs(ascent.climbed_at).format('MMM D, YYYY')}
                </Typography>
                <Chip
                  label={ascent.is_ascent ? (ascent.tries === 1 ? 'Flash' : 'Send') : 'Attempt'}
                  size="small"
                  sx={{
                    height: themeTokens.spacing[5],
                    fontSize: themeTokens.typography.fontSize.xs,
                    bgcolor: ascent.is_ascent ? themeTokens.colors.successBg : themeTokens.neutral[100],
                    color: ascent.is_ascent ? themeTokens.colors.success : themeTokens.neutral[500],
                  }}
                />
                {ascent.tries > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.xs }}>
                    {ascent.tries} tries
                  </Typography>
                )}
              </Box>
              {ascent.is_ascent && ascent.quality != null && ascent.quality > 0 && (
                <Rating readOnly value={ascent.quality} max={5} size="small" sx={{ mt: 0.25, fontSize: themeTokens.typography.fontSize.xs }} />
              )}
              {ascent.comment && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.25,
                    fontSize: themeTokens.typography.fontSize.xs,
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {ascent.comment}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PlayViewComments;
