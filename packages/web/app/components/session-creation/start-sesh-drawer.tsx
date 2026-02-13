'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import SessionCreationForm from './session-creation-form';
import type { SessionCreationFormData } from './session-creation-form';
import BoardSelectorDrawer from '@/app/components/board-selector-drawer/board-selector-drawer';
import BoardScrollSection from '@/app/components/board-scroll/board-scroll-section';
import BoardScrollCard from '@/app/components/board-scroll/board-scroll-card';
import CreateBoardCard from '@/app/components/board-scroll/create-board-card';
import { useCreateSession } from '@/app/hooks/use-create-session';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import AuthModal from '../auth/auth-modal';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import type { StoredBoardConfig } from '@/app/lib/saved-boards-db';

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
  const [selectedCustomConfig, setSelectedCustomConfig] = useState<StoredBoardConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBoardDrawer, setShowBoardDrawer] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const isLoggedIn = status === 'authenticated';

  const handleClose = useCallback(() => {
    onClose();
    setSelectedBoard(null);
    setSelectedCustomPath(null);
    setSelectedCustomConfig(null);
    setFormKey((k) => k + 1);
  }, [onClose]);

  const handleBoardSelect = (board: (typeof boards)[number]) => {
    setSelectedBoard(board);
    setSelectedCustomPath(null);
    setSelectedCustomConfig(null);
  };

  const handleCustomSelect = (url: string, config?: StoredBoardConfig) => {
    setSelectedCustomPath(url);
    setSelectedCustomConfig(config ?? null);
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

  const boardSelector = (
    <Box>
      <BoardScrollSection title="Select a board" loading={isLoadingBoards}>
        <CreateBoardCard
          onClick={() => setShowBoardDrawer(true)}
          label="Custom"
        />
        {selectedCustomConfig && (
          <BoardScrollCard
            key={`custom-${selectedCustomConfig.name}`}
            storedConfig={selectedCustomConfig}
            boardConfigs={boardConfigs}
            selected
            onClick={() => setShowBoardDrawer(true)}
          />
        )}
        {boards.map((board) => (
          <BoardScrollCard
            key={board.uuid}
            userBoard={board}
            selected={selectedBoard?.uuid === board.uuid}
            onClick={() => handleBoardSelect(board)}
          />
        ))}
      </BoardScrollSection>
      {boardsError && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          {boardsError}
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
          placement="top"
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
