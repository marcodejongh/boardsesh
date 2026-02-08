'use client';
import React, { useState } from 'react';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import { LayoutRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';

const LayoutSelection = ({ layouts = [] }: { layouts: LayoutRow[]; boardName: BoardName }) => {
  const router = useRouter();
  const [selectedLayout, setSelectedLayout] = useState<number | ''>('');

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedLayout}`);
  };

  return (
    <Box sx={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select a layout</Typography>
      <FormControl fullWidth sx={{ mt: 2 }} required>
        <InputLabel>Layout</InputLabel>
        <MuiSelect
          value={selectedLayout}
          label="Layout"
          onChange={(e) => setSelectedLayout(e.target.value as number)}
        >
          {layouts.map(({ id: layoutId, name: layoutName }) => (
            <MenuItem key={layoutId} value={layoutId}>
              {layoutName}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
      <Button variant="contained" fullWidth sx={{ marginTop: '16px' }} onClick={handleNext} disabled={!selectedLayout}>
        Next
      </Button>
    </Box>
  );
};

export default LayoutSelection;
