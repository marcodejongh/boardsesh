'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import type { SxProps, Theme } from '@mui/material/styles';

type ResultStatus = 'success' | 'error' | 'info' | 'warning';

type ResultPageProps = {
  status: ResultStatus;
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  extra?: React.ReactNode;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
};

const statusIcons: Record<ResultStatus, React.ReactNode> = {
  success: <CheckCircleOutlined sx={{ fontSize: 72, color: 'success.main' }} />,
  error: <ErrorOutlined sx={{ fontSize: 72, color: 'error.main' }} />,
  info: <InfoOutlined sx={{ fontSize: 72, color: 'info.main' }} />,
  warning: <WarningAmberOutlined sx={{ fontSize: 72, color: 'warning.main' }} />,
};

export function ResultPage({ status, title, subTitle, extra, icon, sx }: ResultPageProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        textAlign: 'center',
        ...sx,
      }}
    >
      <Box sx={{ mb: 3 }}>{icon || statusIcons[status]}</Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subTitle && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {subTitle}
        </Typography>
      )}
      {extra && <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>{extra}</Box>}
    </Box>
  );
}
