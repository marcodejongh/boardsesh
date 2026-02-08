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
import { SetRow } from '@/app/lib/data/queries';

const SetsSelection = ({ sets = [] }: { sets: SetRow[] }) => {
  const router = useRouter();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedSets.join(',')}`);
  };

  return (
    <Box sx={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select Hold Sets</Typography>
      <FormControl fullWidth sx={{ mt: 2 }} required>
        <InputLabel>Sets</InputLabel>
        <MuiSelect
          multiple
          value={selectedSets}
          label="Sets"
          onChange={(e) => setSelectedSets(e.target.value as number[])}
        >
          {sets.map(({ id, name }) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
      <Button
        variant="contained"
        fullWidth
        sx={{ marginTop: '16px' }}
        onClick={handleNext}
        disabled={selectedSets.length === 0}
      >
        Next
      </Button>
    </Box>
  );
};

export default SetsSelection;
