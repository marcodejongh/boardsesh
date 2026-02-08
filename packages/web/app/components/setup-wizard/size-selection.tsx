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
import { SizeRow } from '@/app/lib/data/queries';

const SizeSelection = ({ sizes = [] }: { sizes: SizeRow[] }) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number | ''>('');

  const handleNext = () => {
    if (selectedSize) {
      router.push(`${window.location.pathname}/${selectedSize}`);
    }
  };

  return (
    <Box sx={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select a size</Typography>
      <FormControl fullWidth sx={{ mt: 2 }} required>
        <InputLabel>Size</InputLabel>
        <MuiSelect
          value={selectedSize}
          label="Size"
          onChange={(e) => setSelectedSize(e.target.value as number)}
        >
          {sizes.map(({ id, name, description }) => (
            <MenuItem key={id} value={id}>
              {`${name} ${description}`}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
      <Button
        variant="contained"
        fullWidth
        sx={{ marginTop: '16px' }}
        onClick={handleNext}
        disabled={!selectedSize}
      >
        Next
      </Button>
    </Box>
  );
};

export default SizeSelection;
