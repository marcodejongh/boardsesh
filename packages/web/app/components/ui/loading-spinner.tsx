'use client';

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { SxProps, Theme } from '@mui/material/styles';

type LoadingSpinnerProps = {
  spinning?: boolean;
  size?: number;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  tip?: React.ReactNode;
};

export function LoadingSpinner({ spinning = true, size = 40, children, sx, tip }: LoadingSpinnerProps) {
  if (!children) {
    if (!spinning) return null;
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          ...sx,
        }}
      >
        <CircularProgress size={size} />
        {tip && (
          <Box sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
            {tip}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      {children}
      {spinning && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1,
          }}
        >
          <CircularProgress size={size} />
          {tip && (
            <Box sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
              {tip}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
