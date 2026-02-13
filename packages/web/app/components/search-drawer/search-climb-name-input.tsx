'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';

const SearchClimbNameInput = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();

  return (
    <TextField
      placeholder="Search climbs..."
      variant="outlined"
      size="small"
      fullWidth
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined color="action" />
            </InputAdornment>
          ),
          endAdornment: uiSearchParams.name ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => updateFilters({ name: '' })}
                edge="end"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
      onChange={(e) => {
        updateFilters({
          name: e.target.value,
        });
      }}
      value={uiSearchParams.name}
    />
  );
};

export default SearchClimbNameInput;
