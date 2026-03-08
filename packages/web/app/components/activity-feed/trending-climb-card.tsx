'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WhatshotOutlined from '@mui/icons-material/WhatshotOutlined';
import type { TrendingClimbItem } from '@boardsesh/shared-schema';
import AscentThumbnail from '@/app/components/activity-feed/ascent-thumbnail';
import { getDefaultBoardConfig, getDefaultClimbViewPath } from '@/app/lib/default-board-configs';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import type { BoardName } from '@/app/lib/types';
import Link from 'next/link';

interface TrendingClimbCardProps {
  item: TrendingClimbItem;
  mode: 'trending' | 'hot';
}

export default function TrendingClimbCard({ item, mode }: TrendingClimbCardProps) {
  const climbViewPath = (() => {
    const boardName = item.boardType as BoardName;
    const angle = item.angle;

    const defaultConfig = getDefaultBoardConfig(boardName, item.layoutId);
    if (defaultConfig) {
      const details = getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: item.layoutId,
        size_id: defaultConfig.sizeId,
        set_ids: defaultConfig.setIds,
      });

      if (details?.layout_name && details.size_name && details.set_names) {
        return constructClimbViewUrlWithSlugs(
          boardName,
          details.layout_name,
          details.size_name,
          details.size_description,
          details.set_names,
          angle,
          item.climbUuid,
          item.climbName || undefined,
        );
      }
    }

    return getDefaultClimbViewPath(boardName, item.layoutId, angle, item.climbUuid);
  })();

  const metricDisplay = mode === 'trending'
    ? `+${item.ascentPctChange?.toFixed(0) ?? 0}%`
    : `+${item.ascentDelta}`;

  const metricSecondary = mode === 'trending'
    ? `+${item.ascentDelta} ascents`
    : item.ascentPctChange != null ? `+${item.ascentPctChange.toFixed(0)}%` : '';

  const MetricIcon = mode === 'trending' ? TrendingUpOutlined : WhatshotOutlined;

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Link href={climbViewPath ?? '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            {item.frames && (
              <AscentThumbnail
                boardType={item.boardType}
                layoutId={item.layoutId}
                angle={item.angle}
                climbUuid={item.climbUuid}
                climbName={item.climbName}
                frames={item.frames}
                isMirror={false}
              />
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {item.climbName || 'Untitled climb'}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                {item.difficultyName && <Chip label={item.difficultyName} size="small" color="primary" />}
                <Chip icon={<LocationOnOutlined />} label={`${item.angle}\u00B0`} size="small" />
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {item.boardType}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MetricIcon
                  fontSize="small"
                  color={mode === 'trending' ? 'success' : 'error'}
                />
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={mode === 'trending' ? 'success.main' : 'error.main'}
                >
                  {metricDisplay}
                </Typography>
                {metricSecondary && (
                  <Typography variant="caption" color="text.secondary">
                    ({metricSecondary})
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {item.currentAscents.toLocaleString()} total
                </Typography>
              </Box>

              {item.setterUsername && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  Set by {item.setterUsername}
                </Typography>
              )}
            </Box>
          </Box>
        </Link>
      </CardContent>
    </Card>
  );
}
