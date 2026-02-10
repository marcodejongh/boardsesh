'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { CREATE_PROPOSAL } from '@/app/lib/graphql/operations/proposals';
import { BOULDER_GRADES, ANGLES } from '@/app/lib/board-data';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import type { Proposal, ProposalType } from '@boardsesh/shared-schema';
import type { BoardName } from '@/app/lib/types';

interface CreateProposalFormProps {
  climbUuid: string;
  boardType: string;
  angle: number;
  isFrozen?: boolean;
  outlierWarning?: boolean;
  currentClimbDifficulty?: string;
  boardName?: string;
  onCreated?: (proposal: Proposal) => void;
}

export default function CreateProposalForm({
  climbUuid,
  boardType,
  angle,
  isFrozen,
  outlierWarning,
  currentClimbDifficulty,
  boardName,
  onCreated,
}: CreateProposalFormProps) {
  const { token } = useWsAuthToken();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ProposalType>('grade');
  const [proposedValue, setProposedValue] = useState(currentClimbDifficulty || '');
  const [reason, setReason] = useState('');
  const [selectedAngle, setSelectedAngle] = useState<number | 'all'>(angle);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const boardAngles = boardName ? (ANGLES[boardName as BoardName] || []) : [];

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleTypeChange = useCallback((_: React.MouseEvent, val: ProposalType | null) => {
    if (!val) return;
    setType(val);
    // Reset proposed value when changing type
    if (val === 'grade') {
      setProposedValue(currentClimbDifficulty || '');
      setSelectedAngle(angle);
    } else {
      setProposedValue('');
      setSelectedAngle('all');
    }
  }, [currentClimbDifficulty, angle]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      setSnackbar('Sign in to create proposals');
      return;
    }
    if (!proposedValue) {
      setSnackbar('Please enter a proposed value');
      return;
    }
    if (type === 'grade' && proposedValue === currentClimbDifficulty) {
      setSnackbar('Proposed grade is the same as the current grade');
      return;
    }

    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ createProposal: Proposal }>(CREATE_PROPOSAL, {
        input: {
          climbUuid,
          boardType,
          angle: selectedAngle === 'all' ? null : selectedAngle,
          type,
          proposedValue,
          reason: reason || null,
        },
      });

      onCreated?.(result.createProposal);
      handleClose();
      setProposedValue(type === 'grade' ? (currentClimbDifficulty || '') : '');
      setReason('');
      setSnackbar('Proposal created');
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  }, [token, climbUuid, boardType, selectedAngle, type, proposedValue, reason, onCreated, handleClose, currentClimbDifficulty]);

  if (isFrozen) return null;

  const gradeBackground = type === 'grade' && proposedValue
    ? getGradeTintColor(proposedValue, 'light')
    : undefined;

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

      <SwipeableDrawer
        placement="bottom"
        title="Create Proposal"
        open={open}
        onClose={handleClose}
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !proposedValue || (type === 'grade' && proposedValue === currentClimbDifficulty)}
              sx={{
                textTransform: 'none',
                bgcolor: themeTokens.colors.primary,
                '&:hover': { bgcolor: themeTokens.colors.primaryHover },
              }}
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Type selector */}
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={handleTypeChange}
            size="small"
            fullWidth
          >
            <ToggleButton value="grade">Grade</ToggleButton>
            <ToggleButton value="classic">Classic</ToggleButton>
            <ToggleButton value="benchmark">Benchmark</ToggleButton>
          </ToggleButtonGroup>

          {/* Angle selector */}
          {boardAngles.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Angle</InputLabel>
              <Select
                value={selectedAngle}
                label="Angle"
                onChange={(e) => setSelectedAngle(e.target.value as number | 'all')}
              >
                {type !== 'grade' && (
                  <MenuItem value="all">All angles</MenuItem>
                )}
                {boardAngles.map((a) => (
                  <MenuItem key={a} value={a}>{a}°</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Grade dropdown */}
          {type === 'grade' && (
            <FormControl size="small" fullWidth>
              <InputLabel>Proposed Grade</InputLabel>
              <Select
                value={proposedValue}
                label="Proposed Grade"
                onChange={(e) => setProposedValue(e.target.value)}
                sx={gradeBackground ? { bgcolor: gradeBackground } : undefined}
              >
                {BOULDER_GRADES.map((grade) => (
                  <MenuItem key={grade.difficulty_id} value={grade.difficulty_name}>
                    {grade.difficulty_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Classic/Benchmark status selector */}
          {(type === 'classic' || type === 'benchmark') && (
            <>
              <Typography variant="caption" sx={{ color: themeTokens.neutral[500] }}>
                {type === 'classic'
                  ? 'Classic proposals apply to all angles by default.'
                  : 'Benchmark proposals apply to all angles by default.'}
              </Typography>
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
            </>
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
      </SwipeableDrawer>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </>
  );
}
