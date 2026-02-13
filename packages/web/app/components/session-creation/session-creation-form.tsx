'use client';

import React, { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';

const COLOR_OPTIONS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#FF9800', '#FF5722',
];

export interface SessionCreationFormData {
  name?: string;
  goal?: string;
  color?: string;
  isPermanent?: boolean;
  discoverable: boolean;
}

interface SessionCreationFormProps {
  onSubmit: (data: SessionCreationFormData) => void | Promise<void>;
  isGymAdmin?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  headerContent?: React.ReactNode;
}

export default function SessionCreationForm({
  onSubmit,
  isGymAdmin = false,
  isSubmitting = false,
  submitLabel = 'Start Sesh',
  headerContent,
}: SessionCreationFormProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isPermanent, setIsPermanent] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);

  const handleSubmit = async () => {
    await onSubmit({
      name: name.trim() || undefined,
      goal: goal.trim() || undefined,
      color,
      isPermanent,
      discoverable,
    });

    // Reset form state after successful submit
    setName('');
    setGoal('');
    setColor(undefined);
    setIsPermanent(false);
    setDiscoverable(true);
  };

  return (
    <Stack spacing={2}>
      {headerContent}

      <TextField
        label="Session name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        size="small"
        inputProps={{ maxLength: 100 }}
        placeholder="e.g., Tuesday Projecting"
      />

      <TextField
        label="Session goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        maxRows={4}
        inputProps={{ maxLength: 500 }}
        placeholder="e.g., Send V5 today"
        helperText={`${goal.length}/500`}
      />

      {/* Color picker */}
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Session color
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {COLOR_OPTIONS.map((c) => (
            <Chip
              key={c}
              size="small"
              onClick={() => setColor(color === c ? undefined : c)}
              sx={{
                bgcolor: c,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: color === c ? '3px solid' : '2px solid transparent',
                borderColor: color === c ? 'text.primary' : 'transparent',
                '& .MuiChip-label': { display: 'none' },
                cursor: 'pointer',
              }}
              label=""
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0}>
          <Typography variant="body2" component="span" fontWeight={600}>
            Discoverable by nearby climbers
          </Typography>
          <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '12px' }}>
            Others nearby can find and join your session
          </Typography>
        </Stack>
        <Switch
          checked={discoverable}
          onChange={(e) => setDiscoverable(e.target.checked)}
        />
      </Box>

      {isGymAdmin && (
        <FormControlLabel
          control={
            <Switch
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
            />
          }
          label="Permanent session (won't auto-end)"
        />
      )}

      <Button
        variant="contained"
        size="large"
        startIcon={isSubmitting ? <CircularProgress size={16} /> : <PlayCircleOutlineOutlined />}
        onClick={handleSubmit}
        disabled={isSubmitting}
        fullWidth
      >
        {submitLabel}
      </Button>
    </Stack>
  );
}
