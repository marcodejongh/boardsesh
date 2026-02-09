'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { themeTokens } from '../../theme/theme-config';
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
              <SearchOutlined sx={{ color: themeTokens.neutral[400] }} />
            </InputAdornment>
          ),
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
