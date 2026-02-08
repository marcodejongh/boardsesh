'use client';

import React from 'react';
import Button from '@mui/material/Button';
import ClearOutlined from '@mui/icons-material/ClearOutlined';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';

const ClearButton = () => {
  const { clearClimbSearchParams } = useUISearchParams();

  return (
    <Button variant="text" startIcon={<ClearOutlined />} onClick={clearClimbSearchParams}>
      Clear All
    </Button>
  );
};

export default ClearButton;
