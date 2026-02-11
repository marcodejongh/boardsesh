'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import LockIcon from '@mui/icons-material/Lock';

interface FreezeIndicatorProps {
  reason?: string | null;
}

export default function FreezeIndicator({ reason }: FreezeIndicatorProps) {
  return (
    <Alert
      severity="warning"
      icon={<LockIcon fontSize="small" />}
      sx={{ mb: 2, fontSize: 13 }}
    >
      This climb is frozen from receiving new proposals.
      {reason && ` Reason: ${reason}`}
    </Alert>
  );
}
