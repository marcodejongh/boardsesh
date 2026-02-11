'use client';

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { themeTokens } from '@/app/theme/theme-config';

interface ProposalVoteBarProps {
  weightedUpvotes: number;
  weightedDownvotes: number;
  requiredUpvotes: number;
  status: string;
}

export default function ProposalVoteBar({
  weightedUpvotes,
  weightedDownvotes,
  requiredUpvotes,
  status,
}: ProposalVoteBarProps) {
  const progress = requiredUpvotes > 0 ? Math.min((weightedUpvotes / requiredUpvotes) * 100, 100) : 0;
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  if (isApproved) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label="Approved"
          size="small"
          sx={{
            bgcolor: themeTokens.colors.successBg,
            color: themeTokens.colors.success,
            fontWeight: 600,
            '& .MuiChip-icon': { color: themeTokens.colors.success },
          }}
        />
      </Box>
    );
  }

  if (isRejected) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label="Rejected"
          size="small"
          sx={{
            bgcolor: themeTokens.colors.errorBg,
            color: themeTokens.colors.error,
            fontWeight: 600,
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: themeTokens.neutral[500] }}>
          {weightedUpvotes} / {requiredUpvotes} votes needed
        </Typography>
        {weightedDownvotes > 0 && (
          <Typography variant="caption" sx={{ color: themeTokens.colors.error }}>
            {weightedDownvotes} opposed
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: themeTokens.neutral[200],
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            bgcolor: progress >= 100 ? themeTokens.colors.success : themeTokens.colors.primary,
          },
        }}
      />
    </Box>
  );
}
