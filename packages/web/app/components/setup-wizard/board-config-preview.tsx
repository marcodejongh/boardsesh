'use client';

import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import MuiTooltip from '@mui/material/Tooltip';
import MuiSkeleton from '@mui/material/Skeleton';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Star from '@mui/icons-material/Star';
import Link from 'next/link';
import { BoardDetails, BoardName } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';

type StoredBoardConfig = {
  name: string;
  board: string;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  useAsDefault: boolean;
  createdAt: string;
  lastUsed?: string;
};

type BoardConfigPreviewProps = {
  config: StoredBoardConfig;
  onDelete: (configName: string) => void;
  onSelect: () => void;
  boardConfigs: BoardConfigData;
  isEditMode?: boolean;
};

export default function BoardConfigPreview({ config, onDelete, onSelect, boardConfigs, isEditMode = false }: BoardConfigPreviewProps) {
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutName, setLayoutName] = useState<string>('');
  const [sizeName, setSizeName] = useState<string>('');
  const [boardUrl, setBoardUrl] = useState<string>('');

  useEffect(() => {
    const loadBoardDetails = async () => {
      try {
        setIsLoading(true);

        // Get data from boardConfigs prop
        const layouts = boardConfigs.layouts[config.board as BoardName] || [];
        const sizes = boardConfigs.sizes[`${config.board}-${config.layoutId}`] || [];
        const sets = boardConfigs.sets[`${config.board}-${config.layoutId}-${config.sizeId}`] || [];
        const detailsKey = `${config.board}-${config.layoutId}-${config.sizeId}-${config.setIds.join(',')}`;
        const cachedDetails = boardConfigs.details[detailsKey];

        // Find layout name
        const layout = layouts.find((l) => l.id === config.layoutId);
        setLayoutName(layout?.name || `Layout ${config.layoutId}`);

        // Find size name
        const size = sizes.find((s) => s.id === config.sizeId);
        setSizeName(size?.name || `Size ${config.sizeId}`);

        // Validate that the saved configuration is still valid
        const isValidConfig = layout && size && config.setIds.every((setId) => sets.some((set) => set.id === setId));

        // Generate the URL - always use SEO-friendly slug URLs
        const savedAngle = config.angle || 40;

        // Get set names for slug generation
        const setNames = sets
          .filter((s) => config.setIds.includes(s.id))
          .map((s) => s.name);

        // Always generate slug-based URL from the pre-loaded board configs data
        if (layout && size && setNames.length > 0) {
          const url = constructClimbListWithSlugs(
            config.board,
            layout.name,
            size.name,
            size.description,
            setNames,
            savedAngle,
          );
          setBoardUrl(url);
        }

        // Only try to get board details for preview rendering if we have cached details or if the config is valid
        let details = cachedDetails;
        if (!details && isValidConfig) {
          try {
            // Use moonboard-specific details for moonboard configs
            if (config.board === 'moonboard') {
              details = getMoonBoardDetails({
                layout_id: config.layoutId,
                set_ids: config.setIds,
              }) as BoardDetails;
            } else {
              details = getBoardDetails({
                board_name: config.board as BoardName,
                layout_id: config.layoutId,
                size_id: config.sizeId,
                set_ids: config.setIds,
              });
            }
            setBoardDetails(details);
          } catch (error) {
            console.error('Failed to get board details:', error);
          }
        } else if (cachedDetails) {
          setBoardDetails(details);
        }
      } catch (error) {
        console.error('Failed to load board details for preview:', error);
        // Try to set slug URL even if loading fails
        const savedAngle = config.angle || 40;
        const layouts = boardConfigs.layouts[config.board as BoardName] || [];
        const sizes = boardConfigs.sizes[`${config.board}-${config.layoutId}`] || [];
        const sets = boardConfigs.sets[`${config.board}-${config.layoutId}-${config.sizeId}`] || [];
        const layout = layouts.find((l) => l.id === config.layoutId);
        const size = sizes.find((s) => s.id === config.sizeId);
        const setNames = sets.filter((s) => config.setIds.includes(s.id)).map((s) => s.name);

        if (layout && size && setNames.length > 0) {
          setBoardUrl(constructClimbListWithSlugs(config.board, layout.name, size.name, size.description, setNames, savedAngle));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBoardDetails();
  }, [config, boardConfigs]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(config.name);
  };

  const handleSelect = () => {
    onSelect();
    // Don't prevent default - let the Link navigate
  };

  if (isLoading) {
    return (
      <Card sx={{ minWidth: 0, '&:hover': { boxShadow: 3 } }}>
        <CardContent sx={{ p: 1.5 }}>
          <MuiSkeleton variant="text" width="60%" />
          <MuiSkeleton variant="text" width="80%" />
          <MuiSkeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    );
  }

  if (!boardDetails) {
    return (
      <Link href={boardUrl} style={{ textDecoration: 'none', minWidth: 0 }} onClick={handleSelect}>
        <Card
          sx={{ minWidth: 0, '&:hover': { boxShadow: 3 } }}
        >
          <CardContent sx={{ p: 1.5 }}>
            {isEditMode && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton onClick={handleDelete} color="error" size="small">
                  <DeleteOutlined />
                </IconButton>
              </div>
            )}
            <Stack spacing={1} alignItems="center">
              <Typography variant="body2" component="span" color="text.secondary">Preview unavailable</Typography>
              <Typography variant="body2" component="span" fontWeight={600}>{config.name}</Typography>
              <Stack spacing={0.25}>
                <Chip label={layoutName} size="small" />
                <Stack direction="row" spacing={0.25}>
                  <Chip label={sizeName} size="small" />
                  <Chip label={config.angle || 40} size="small" />
                  {config.useAsDefault && <Star />}
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={boardUrl} style={{ textDecoration: 'none', minWidth: 0 }} onClick={handleSelect}>
      <Card
        sx={{ minWidth: 0, '&:hover': { boxShadow: 3 } }}
      >
        <BoardRenderer
          litUpHoldsMap={{}} // Empty holds map - just show the board
          mirrored={false}
          boardDetails={boardDetails}
          thumbnail={true}
        />
        <CardContent sx={{ p: 1.5 }}>
          {isEditMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton onClick={handleDelete} color="error" size="small">
                <DeleteOutlined />
              </IconButton>
            </div>
          )}
          <Typography variant="body2" component="span" fontWeight={600}>{config.name}</Typography>
          <Stack spacing={0.25}>
            <Chip label={layoutName} size="small" />
            <Stack direction="row" spacing={0.25}>
              <Chip label={sizeName} size="small" />
              <Chip label={config.angle || 40} size="small" />
              {config.useAsDefault && (
                <MuiTooltip title="Default configuration">
                  <Star />
                </MuiTooltip>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Link>
  );
}
