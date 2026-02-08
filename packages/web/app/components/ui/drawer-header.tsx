'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import type { SxProps, Theme } from '@mui/material/styles';

type DrawerHeaderProps = {
  title?: React.ReactNode;
  onClose?: () => void;
  extra?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export function DrawerHeader({ title, onClose, extra, sx }: DrawerHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: 1,
        borderColor: 'divider',
        ...sx,
      }}
    >
      {typeof title === 'string' ? (
        <Typography variant="h6">{title}</Typography>
      ) : (
        title
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {extra}
        {onClose && (
          <IconButton onClick={onClose} size="small" edge="end">
            <CloseOutlined />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
