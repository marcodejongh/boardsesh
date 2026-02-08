'use client';

import React, { useState } from 'react';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

type ConfirmPopoverProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
};

export function ConfirmPopover({
  title,
  description,
  onConfirm,
  onCancel,
  okText = 'Yes',
  cancelText = 'No',
  okButtonProps,
  children,
}: ConfirmPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    onCancel?.();
  };

  const handleConfirm = () => {
    setAnchorEl(null);
    onConfirm();
  };

  return (
    <>
      {React.cloneElement(children, { onClick: handleOpen })}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: description ? 0.5 : 1 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={handleClose}>
              {cancelText}
            </Button>
            <Button size="small" variant="contained" onClick={handleConfirm} {...okButtonProps}>
              {okText}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
