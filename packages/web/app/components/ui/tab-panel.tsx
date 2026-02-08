'use client';

import React from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

type TabPanelProps = {
  children?: React.ReactNode;
  index: number | string;
  value: number | string;
  sx?: SxProps<Theme>;
};

export function TabPanel({ children, value, index, sx }: TabPanelProps) {
  if (value !== index) return null;

  return (
    <Box role="tabpanel" sx={sx}>
      {children}
    </Box>
  );
}
