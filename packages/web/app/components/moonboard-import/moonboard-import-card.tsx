'use client';

import React from 'react';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { ConfirmPopover } from '@/app/components/ui/confirm-popover';
import { EditOutlined, DeleteOutlined } from '@mui/icons-material';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import type { MoonBoardClimb } from '@boardsesh/moonboard-ocr/browser';
import type { LitUpHoldsMap } from '../board-renderer/types';
import styles from './moonboard-import-card.module.css';


interface MoonBoardImportCardProps {
  climb: MoonBoardClimb;
  layoutFolder: string;
  holdSetImages: string[];
  litUpHoldsMap: LitUpHoldsMap;
  onEdit: () => void;
  onRemove: () => void;
}

export default function MoonBoardImportCard({
  climb,
  layoutFolder,
  holdSetImages,
  litUpHoldsMap,
  onEdit,
  onRemove,
}: MoonBoardImportCardProps) {
  const totalHolds = climb.holds.start.length + climb.holds.hand.length + climb.holds.finish.length;

  return (
    <MuiCard className={styles.card}>
      <div className={styles.boardPreview}>
        <MoonBoardRenderer
          layoutFolder={layoutFolder}
          holdSetImages={holdSetImages}
          litUpHoldsMap={litUpHoldsMap}
        />
      </div>
      <CardContent>
        <div className={styles.titleRow}>
          <Typography variant="body2" component="span" fontWeight={600} noWrap>
            {climb.name || 'Unnamed Climb'}
          </Typography>
          {climb.isBenchmark && (
            <Chip label="B" size="small" sx={{ bgcolor: '#FBBF24', color: '#000' }} className={styles.benchmarkTag} />
          )}
        </div>
        <div className={styles.metadata}>
          <Typography variant="body1" component="p" color="text.secondary" noWrap className={styles.setter}>
            by {climb.setter || 'Unknown'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={climb.userGrade || 'No grade'} size="small" color="primary" />
            <Chip label={`${climb.angle}°`} size="small" />
            <Chip label={`${totalHolds} holds`} size="small" />
          </Stack>
        </div>
      </CardContent>
      <CardActions>
        <MuiButton key="edit" variant="text" startIcon={<EditOutlined />} onClick={onEdit}>
          Edit
        </MuiButton>
        <ConfirmPopover
          title="Remove this climb?"
          description="This climb will not be imported."
          onConfirm={onRemove}
          okText="Remove"
          cancelText="Cancel"
        >
          <MuiButton variant="text" color="error" startIcon={<DeleteOutlined />}>
            Remove
          </MuiButton>
        </ConfirmPopover>
      </CardActions>
    </MuiCard>
  );
}
