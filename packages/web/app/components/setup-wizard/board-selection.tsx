'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';

const BoardSelection = () => {
  const router = useRouter();
  const [selectedBoard, setSelectedBoard] = React.useState<string>('kilter');

  const handleNext = () => {
    router.push(`/${selectedBoard}`);
  };

  return (
    <Box sx={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select a board</Typography>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Board</InputLabel>
        <MuiSelect
          value={selectedBoard}
          label="Board"
          onChange={(e) => setSelectedBoard(e.target.value)}
        >
          {SUPPORTED_BOARDS.map((board_name) => (
            <MenuItem key={board_name} value={board_name}>
              {board_name}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
      <Button variant="contained" fullWidth sx={{ marginTop: '16px' }} onClick={handleNext}>
        Next
      </Button>
    </Box>
  );
};

export default BoardSelection;
