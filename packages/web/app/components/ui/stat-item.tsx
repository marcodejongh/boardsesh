import React from 'react';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import { themeTokens } from '@/app/theme/theme-config';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

export default function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ color: 'var(--neutral-400)', display: 'flex' }}>{icon}</Box>
      <MuiTypography variant="body2" sx={{ fontWeight: themeTokens.typography.fontWeight.medium }}>
        {value}
      </MuiTypography>
      <MuiTypography variant="body2" color="text.secondary">
        {label}
      </MuiTypography>
    </Box>
  );
}
