'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import SessionCreationForm from './session-creation-form';
import type { SessionCreationFormData } from './session-creation-form';

export type { SessionCreationFormData };

interface SessionCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SessionCreationFormData) => void;
  isGymAdmin?: boolean;
  isSubmitting?: boolean;
}

export default function SessionCreationDialog({
  open,
  onClose,
  onSubmit,
  isGymAdmin = false,
  isSubmitting = false,
}: SessionCreationDialogProps) {
  const handleSubmit = (data: SessionCreationFormData) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Session</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <SessionCreationForm
          onSubmit={handleSubmit}
          isGymAdmin={isGymAdmin}
          isSubmitting={isSubmitting}
          submitLabel="Create Session"
        />
      </DialogContent>
    </Dialog>
  );
}
