'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import SessionCreationForm from './session-creation-form';
import type { SessionCreationFormData } from './session-creation-form';
import BoardSelectorPills from '@/app/components/board-entity/board-selector-pills';
import { useCreateSession } from '@/app/hooks/use-create-session';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { constructBoardSlugUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '../auth/auth-modal';
import type { UserBoard } from '@boardsesh/shared-schema';

interface StartSeshDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function StartSeshDrawer({ open, onClose }: StartSeshDrawerProps) {
  const { status } = useSession();
  const router = useRouter();
  const { showMessage } = useSnackbar();
  const { createSession, isCreating } = useCreateSession();
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isLoggedIn = status === 'authenticated';

  const handleBoardSelect = (board: UserBoard) => {
    setSelectedBoard(board);
  };

  const handleSubmit = async (formData: SessionCreationFormData) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    if (!selectedBoard) {
      showMessage('Please select a board first', 'warning');
      return;
    }

    try {
      const boardPath = `/b/${selectedBoard.slug}`;
      const sessionId = await createSession(formData, boardPath);

      // Navigate to board page with session
      const boardUrl = constructBoardSlugUrl(selectedBoard.slug, 40);
      router.push(`${boardUrl}?session=${sessionId}`);

      onClose();
      showMessage('Session started!', 'success');
    } catch (error) {
      console.error('Failed to create session:', error);
      showMessage('Failed to start session', 'error');
    }
  };

  const boardSelector = (
    <Box>
      <Typography variant="body2" component="span" fontWeight={600} gutterBottom>
        Select a board
      </Typography>
      <BoardSelectorPills
        mode="filter"
        selectedBoardUuid={selectedBoard?.uuid ?? null}
        onBoardSelect={handleBoardSelect}
      />
      {selectedBoard && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {selectedBoard.name}
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <SwipeableDrawer
        title="Start Sesh"
        placement="top"
        open={open}
        onClose={onClose}
      >
        {!isLoggedIn ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 3,
            }}
          >
            <Typography variant="body2" component="span" color="text.secondary">
              Sign in to start a climbing session
            </Typography>
            <Button
              variant="contained"
              startIcon={<LoginOutlined />}
              onClick={() => setShowAuthModal(true)}
            >
              Sign in
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" component="span">
              Start a session to track your climbing and invite others to join.
            </Typography>
            <SessionCreationForm
              onSubmit={handleSubmit}
              isSubmitting={isCreating}
              submitLabel="Start Sesh"
              headerContent={boardSelector}
            />
          </Box>
        )}
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to start a session"
        description="Create an account or sign in to start climbing sessions."
      />
    </>
  );
}
