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
import { ANGLES } from '@/app/lib/board-data';
import { BoardName } from '@/app/lib/types';

const AngleSelection = ({ board_name }: { board_name: BoardName }) => {
  const router = useRouter();
  const [angle, setAngle] = React.useState(40);

  const handleNext = () => {
    router.push(`${window.location.pathname}/${angle}/list`);
  };

  return (
    <Box sx={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select an angle</Typography>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Angle</InputLabel>
        <MuiSelect
          value={angle}
          label="Angle"
          onChange={(e) => setAngle(Number(e.target.value))}
        >
          {ANGLES[board_name].map((angle) => (
            <MenuItem key={angle} value={angle}>
              {angle}
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

export default AngleSelection;
