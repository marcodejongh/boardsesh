'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import SessionCreationForm from './session-creation-form';
import type { SessionCreationFormData } from './session-creation-form';
import BoardSelectorDrawer from '@/app/components/board-selector-drawer/board-selector-drawer';
import { useCreateSession } from '@/app/hooks/use-create-session';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import AuthModal from '../auth/auth-modal';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { themeTokens } from '@/app/theme/theme-config';

interface StartSeshDrawerProps {
  open: boolean;
  onClose: () => void;
  boardConfigs?: BoardConfigData;
}

export default function StartSeshDrawer({ open, onClose, boardConfigs }: StartSeshDrawerProps) {
  const { status } = useSession();
  const router = useRouter();
  const { showMessage } = useSnackbar();
  const { createSession, isCreating } = useCreateSession();
  const { boards, isLoading: isLoadingBoards, error: boardsError } = useMyBoards(open);

  const [selectedBoard, setSelectedBoard] = useState<(typeof boards)[number] | null>(null);
  const [selectedCustomPath, setSelectedCustomPath] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBoardDrawer, setShowBoardDrawer] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const isLoggedIn = status === 'authenticated';

  const handleClose = useCallback(() => {
    onClose();
    setSelectedBoard(null);
    setSelectedCustomPath(null);
    setFormKey((k) => k + 1);
  }, [onClose]);

  const handleBoardSelect = (board: (typeof boards)[number]) => {
    setSelectedBoard(board);
    setSelectedCustomPath(null);
  };

  const handleCustomSelect = (url: string) => {
    setSelectedCustomPath(url);
    setSelectedBoard(null);
    setShowBoardDrawer(false);
  };

  const handleSubmit = async (formData: SessionCreationFormData) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    if (!selectedBoard && !selectedCustomPath) {
      showMessage('Please select a board first', 'warning');
      return;
    }

    try {
      let boardPath: string;
      let navigateUrl: string;

      if (selectedBoard) {
        boardPath = `/b/${selectedBoard.slug}`;
        navigateUrl = constructBoardSlugListUrl(selectedBoard.slug, selectedBoard.angle);
      } else if (selectedCustomPath) {
        boardPath = selectedCustomPath;
        navigateUrl = selectedCustomPath;
      } else {
        return;
      }

      const sessionId = await createSession(formData, boardPath);
      router.push(`${navigateUrl}?session=${sessionId}`);

      handleClose();
      showMessage('Session started!', 'success');
    } catch (error) {
      console.error('Failed to create session:', error);
      showMessage('Failed to start session', 'error');
      throw error;
    }
  };

  const isCustomSelected = selectedCustomPath !== null;

  const boardSelector = (
    <Box>
      <Typography variant="body2" component="span" fontWeight={600} gutterBottom>
        Select a board
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          py: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Chip
          icon={<TuneOutlined />}
          label="Custom"
          size="small"
          variant={isCustomSelected ? 'filled' : 'outlined'}
          color={isCustomSelected ? 'primary' : 'default'}
          disabled={!boardConfigs}
          onClick={() => setShowBoardDrawer(true)}
          sx={{
            flexShrink: 0,
            fontWeight: isCustomSelected
              ? themeTokens.typography.fontWeight.semibold
              : themeTokens.typography.fontWeight.normal,
          }}
        />
        {isLoadingBoards ? (
          <CircularProgress size={20} sx={{ mx: 1, alignSelf: 'center' }} />
        ) : (
          boards.map((board) => (
            <Chip
              key={board.uuid}
              label={board.name}
              size="small"
              variant={selectedBoard?.uuid === board.uuid ? 'filled' : 'outlined'}
              color={selectedBoard?.uuid === board.uuid ? 'primary' : 'default'}
              onClick={() => handleBoardSelect(board)}
              sx={{
                flexShrink: 0,
                fontWeight: selectedBoard?.uuid === board.uuid
                  ? themeTokens.typography.fontWeight.semibold
                  : themeTokens.typography.fontWeight.normal,
              }}
            />
          ))
        )}
      </Box>
      {boardsError && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          {boardsError}
        </Typography>
      )}
      {selectedCustomPath && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Custom board configuration
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <SwipeableDrawer
        title="Sesh"
        placement="top"
        open={open}
        onClose={handleClose}
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
              key={formKey}
              onSubmit={handleSubmit}
              isSubmitting={isCreating}
              submitLabel="Sesh"
              headerContent={boardSelector}
            />
          </Box>
        )}
      </SwipeableDrawer>

      {boardConfigs && (
        <BoardSelectorDrawer
          open={showBoardDrawer}
          onClose={() => setShowBoardDrawer(false)}
          boardConfigs={boardConfigs}
          onBoardSelected={handleCustomSelect}
        />
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to start a session"
        description="Create an account or sign in to start climbing sessions."
      />
    </>
  );
}
