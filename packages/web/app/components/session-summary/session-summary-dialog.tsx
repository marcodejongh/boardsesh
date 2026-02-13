'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import type { SessionSummary } from '@boardsesh/shared-schema';
import SessionSummaryView from './session-summary-view';

interface SessionSummaryDialogProps {
  summary: SessionSummary | null;
  onDismiss: () => void;
}

export default function SessionSummaryDialog({ summary, onDismiss }: SessionSummaryDialogProps) {
  return (
    <Dialog open={summary !== null} onClose={onDismiss} maxWidth="sm" fullWidth>
      <DialogTitle>Session Summary</DialogTitle>
      <DialogContent>
        {summary && <SessionSummaryView summary={summary} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onDismiss} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
