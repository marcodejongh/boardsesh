'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import type { SxProps, Theme } from '@mui/material/styles';

type EmptyStateProps = {
  icon?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export function EmptyState({ icon, description = 'No data', children, sx }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        color: 'text.secondary',
        ...sx,
      }}
    >
      <Box sx={{ fontSize: 48, mb: 1, opacity: 0.4 }}>
        {icon || <InboxOutlined fontSize="inherit" />}
      </Box>
      {typeof description === 'string' ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : (
        description
      )}
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
}
