'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

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

interface SessionCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SessionCreationFormData) => void;
  isGymAdmin?: boolean;
}

export default function SessionCreationDialog({
  open,
  onClose,
  onSubmit,
  isGymAdmin = false,
}: SessionCreationDialogProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isPermanent, setIsPermanent] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);

  const handleSubmit = () => {
    onSubmit({
      name: name.trim() || undefined,
      goal: goal.trim() || undefined,
      color,
      isPermanent,
      discoverable,
    });
    onClose();
  };

  const handleClose = () => {
    setName('');
    setGoal('');
    setColor(undefined);
    setIsPermanent(false);
    setDiscoverable(true);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Session name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 100 }}
            placeholder="e.g., Tuesday Projecting"
          />

          <TextField
            label="Session goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            fullWidth
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

          <FormControlLabel
            control={
              <Switch
                checked={discoverable}
                onChange={(e) => setDiscoverable(e.target.checked)}
              />
            }
            label="Discoverable by nearby climbers"
          />

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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Create Session
        </Button>
      </DialogActions>
    </Dialog>
  );
}
