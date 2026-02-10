'use client';

import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { SortMode } from '@boardsesh/shared-schema';

interface FeedSortSelectorProps {
  sortBy: SortMode;
  onChange: (sort: SortMode) => void;
}

export default function FeedSortSelector({ sortBy, onChange }: FeedSortSelectorProps) {
  const handleChange = (_: React.MouseEvent<HTMLElement>, value: SortMode | null) => {
    if (value) {
      onChange(value);
    }
  };

  return (
    <ToggleButtonGroup
      value={sortBy}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, py: 0.25 } }}
    >
      <ToggleButton value="new">New</ToggleButton>
      <ToggleButton value="top">Top</ToggleButton>
      <ToggleButton value="controversial">Controversial</ToggleButton>
      <ToggleButton value="hot">Hot</ToggleButton>
    </ToggleButtonGroup>
  );
}
