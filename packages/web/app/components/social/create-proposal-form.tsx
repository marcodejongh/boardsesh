'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/components/auth/ws-auth-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { CREATE_PROPOSAL } from '@/app/lib/graphql/operations/proposals';
import type { Proposal, ProposalType } from '@boardsesh/shared-schema';

interface CreateProposalFormProps {
  climbUuid: string;
  boardType: string;
  angle: number;
  isFrozen?: boolean;
  outlierWarning?: boolean;
  onCreated?: (proposal: Proposal) => void;
}

export default function CreateProposalForm({
  climbUuid,
  boardType,
  angle,
  isFrozen,
  outlierWarning,
  onCreated,
}: CreateProposalFormProps) {
  const { token } = useWsAuthToken();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ProposalType>('grade');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!token) {
      setSnackbar('Sign in to create proposals');
      return;
    }
    if (!proposedValue) {
      setSnackbar('Please enter a proposed value');
      return;
    }

    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ createProposal: Proposal }>(CREATE_PROPOSAL, {
        input: {
          climbUuid,
          boardType,
          angle: type === 'classic' ? null : angle,
          type,
          proposedValue: type === 'classic' || type === 'benchmark' ? proposedValue : proposedValue,
          reason: reason || null,
        },
      });

      onCreated?.(result.createProposal);
      setOpen(false);
      setProposedValue('');
      setReason('');
      setSnackbar('Proposal created');
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  }, [token, climbUuid, boardType, angle, type, proposedValue, reason, onCreated]);

  if (isFrozen) return null;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => {
          if (!token) {
            setSnackbar('Sign in to create proposals');
            return;
          }
          setOpen(true);
        }}
        sx={{
          textTransform: 'none',
          borderColor: themeTokens.neutral[300],
          color: themeTokens.neutral[600],
          fontSize: 13,
        }}
      >
        Propose Change
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Proposal</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Type selector */}
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={(_, val) => val && setType(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="grade">Grade</ToggleButton>
              <ToggleButton value="classic">Classic</ToggleButton>
              <ToggleButton value="benchmark">Benchmark</ToggleButton>
            </ToggleButtonGroup>

            {type === 'classic' && (
              <Typography variant="caption" sx={{ color: themeTokens.neutral[500] }}>
                Classic proposals apply to all angles.
              </Typography>
            )}

            {/* Value input */}
            {type === 'grade' && (
              <TextField
                label="Proposed Grade"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder="e.g., V5 or 6B+"
                size="small"
                fullWidth
              />
            )}

            {(type === 'classic' || type === 'benchmark') && (
              <FormControl size="small" fullWidth>
                <InputLabel>Proposed Status</InputLabel>
                <Select
                  value={proposedValue}
                  label="Proposed Status"
                  onChange={(e) => setProposedValue(e.target.value)}
                >
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Reason */}
            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={2}
              size="small"
              fullWidth
              placeholder="Why do you think this change is needed?"
            />

            {/* Outlier warning */}
            {outlierWarning && type === 'grade' && (
              <Alert severity="info" sx={{ fontSize: 13 }}>
                The grade at this angle appears to be an outlier compared to adjacent angles.
                This proposal may be auto-approved if it aligns with neighboring data.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !proposedValue}
            sx={{
              textTransform: 'none',
              bgcolor: themeTokens.colors.primary,
              '&:hover': { bgcolor: themeTokens.colors.primaryHover },
            }}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </>
  );
}
