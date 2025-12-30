'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Switch, Button, Typography, Tag, Alert, Flex } from 'antd';
import { ExperimentOutlined, SettingOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import BoardRenderer from '../board-renderer/board-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { useBoardBluetooth } from '../board-bluetooth-control/use-board-bluetooth';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '../board-renderer/util';
import AuthModal from '../auth/auth-modal';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './create-climb-form.module.css';

const { Text } = Typography;

interface CreateClimbFormValues {
  name: string;
  description: string;
  isDraft: boolean;
}

interface CreateClimbFormProps {
  boardDetails: BoardDetails;
  angle: number;
  forkFrames?: string;
  forkName?: string;
}

export default function CreateClimbForm({ boardDetails, angle, forkFrames, forkName }: CreateClimbFormProps) {
  const router = useRouter();
  const { isAuthenticated, hasAuroraCredentials, saveClimb } = useBoardProvider();

  // Convert fork frames to initial holds map if provided
  const initialHoldsMap = useMemo(() => {
    if (!forkFrames) return undefined;
    const framesMap = convertLitUpHoldsStringToMap(forkFrames, boardDetails.board_name);
    // Get the first frame (frame 0) - most climbs have a single frame
    return framesMap[0] ?? undefined;
  }, [forkFrames, boardDetails.board_name]);

  const {
    litUpHoldsMap,
    handleHoldClick: originalHandleHoldClick,
    generateFramesString,
    startingCount,
    finishCount,
    totalHolds,
    isValid,
    resetHolds: originalResetHolds,
  } = useCreateClimb(boardDetails.board_name, { initialHoldsMap });

  const { isConnected, sendFramesToBoard } = useBoardBluetooth({ boardDetails });

  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CreateClimbFormValues | null>(null);

  // Editable title state
  const [climbName, setClimbName] = useState(forkName ? `${forkName} fork` : '');
  const [description, setDescription] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Send frames to board whenever litUpHoldsMap changes and we're connected
  useEffect(() => {
    if (isConnected) {
      const frames = generateFramesString();
      sendFramesToBoard(frames);
    }
  }, [litUpHoldsMap, isConnected, generateFramesString, sendFramesToBoard]);

  // Wrap handleHoldClick to also send to board after state updates
  const handleHoldClick = useCallback(
    (holdId: number) => {
      originalHandleHoldClick(holdId);
      // The useEffect above will handle sending to board after state updates
    },
    [originalHandleHoldClick],
  );

  // Wrap resetHolds to also clear the board
  const resetHolds = useCallback(() => {
    originalResetHolds();
    // Send empty frames to clear the board
    if (isConnected) {
      sendFramesToBoard('');
    }
  }, [originalResetHolds, isConnected, sendFramesToBoard]);

  // Title editing handlers
  const handleStartEditTitle = useCallback(() => {
    setEditingName(climbName);
    setIsEditingTitle(true);
    // Focus the input after it renders
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [climbName]);

  const handleSaveTitle = useCallback(() => {
    if (editingName.trim()) {
      setClimbName(editingName.trim());
    }
    setIsEditingTitle(false);
  }, [editingName]);

  const handleCancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditingName('');
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveTitle();
      } else if (e.key === 'Escape') {
        handleCancelEditTitle();
      }
    },
    [handleSaveTitle, handleCancelEditTitle],
  );

  const doSaveClimb = async () => {
    setIsSaving(true);

    try {
      const frames = generateFramesString();

      await saveClimb({
        layout_id: boardDetails.layout_id,
        name: climbName,
        description: description || '',
        is_draft: isDraft,
        frames,
        frames_count: 1,
        frames_pace: 0,
        angle,
      });

      track('Climb Created', {
        boardLayout: boardDetails.layout_name || '',
        isDraft: isDraft,
        holdCount: totalHolds,
      });

      // Navigate back to the climb list
      const listUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name || '',
        boardDetails.size_name || '',
        boardDetails.size_description,
        boardDetails.set_names || [],
        angle,
      );
      router.push(listUrl);
    } catch (error) {
      console.error('Failed to save climb:', error);
      track('Climb Create Failed', {
        boardLayout: boardDetails.layout_name || '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isValid || !climbName.trim()) {
      return;
    }

    if (!isAuthenticated) {
      // Store the form values and show auth modal
      setPendingFormValues({ name: climbName, description, isDraft });
      setShowAuthModal(true);
      return;
    }

    if (!hasAuroraCredentials) {
      // User is logged in but hasn't linked their Aurora account
      // This shouldn't happen due to the UI, but handle it gracefully
      return;
    }

    await doSaveClimb();
  };

  const handleAuthSuccess = async () => {
    // After successful auth, check if they have Aurora credentials linked
    // If not, they'll see the message in the form
    // If yes and we have pending form values, we need to wait for the credentials to load
    if (pendingFormValues) {
      // Give time for the board provider to refresh credentials
      setTimeout(async () => {
        // The component will re-render with new auth state
        // User needs to click save again after linking their account
        setPendingFormValues(null);
      }, 1000);
    }
  };

  const handleCancel = () => {
    const listUrl = constructClimbListWithSlugs(
      boardDetails.board_name,
      boardDetails.layout_name || '',
      boardDetails.size_name || '',
      boardDetails.size_description,
      boardDetails.set_names || [],
      angle,
    );
    router.push(listUrl);
  };

  const boardNameCapitalized = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  const canSave = isAuthenticated && hasAuroraCredentials && isValid && climbName.trim().length > 0;

  return (
    <div className={styles.pageContainer} style={{ backgroundColor: themeTokens.semantic.background }}>
      {/* Header with publish button */}
      <div className={styles.headerBar}>
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Flex gap={8} align="center">
          <ExperimentOutlined style={{ color: themeTokens.colors.primary }} title="Beta Feature" />
          <Button
            type="primary"
            onClick={handlePublish}
            loading={isSaving}
            disabled={!canSave || isSaving}
          >
            {isSaving ? 'Publishing...' : 'Publish'}
          </Button>
        </Flex>
      </div>

      {/* Auth alerts */}
      {!isAuthenticated && (
        <Alert
          message="Sign in required"
          description="Sign in to your Boardsesh account to save your climb."
          type="warning"
          showIcon
          className={styles.authAlert}
          action={
            <Button size="small" type="primary" onClick={() => setShowAuthModal(true)}>
              Sign In
            </Button>
          }
        />
      )}

      {isAuthenticated && !hasAuroraCredentials && (
        <Alert
          message={`Link your ${boardNameCapitalized} account`}
          description={`Link your ${boardNameCapitalized} Board account in Settings to save climbs.`}
          type="warning"
          showIcon
          className={styles.authAlert}
          action={
            <Button size="small" icon={<SettingOutlined />} onClick={() => router.push('/settings')}>
              Settings
            </Button>
          }
        />
      )}

      {/* Main Content - matches play view layout */}
      <div className={styles.contentWrapper}>
        {/* Title section - same position as play view */}
        <div
          className={styles.climbTitleContainer}
          style={{
            padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[3]}px`,
          }}
        >
          <Flex gap={12} align="center">
            {/* Left side: Editable Name and draft toggle stacked */}
            <Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: Editable Title */}
              {isEditingTitle ? (
                <Flex gap={4} align="center">
                  <Input
                    ref={titleInputRef as React.Ref<any>}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleSaveTitle}
                    maxLength={100}
                    placeholder="Enter climb name"
                    size="small"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    size="small"
                    onClick={handleSaveTitle}
                  />
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={handleCancelEditTitle}
                  />
                </Flex>
              ) : (
                <div
                  className={styles.editableTitle}
                  onClick={handleStartEditTitle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartEditTitle()}
                >
                  <Text
                    style={{
                      fontSize: themeTokens.typography.fontSize.sm,
                      fontWeight: themeTokens.typography.fontWeight.bold,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {climbName || 'Tap to name your climb'}
                  </Text>
                  <EditOutlined
                    style={{
                      fontSize: themeTokens.typography.fontSize.xs,
                      color: themeTokens.neutral[400],
                      marginLeft: 4,
                    }}
                  />
                </div>
              )}
              {/* Row 2: Draft toggle */}
              <Flex gap={8} align="center">
                <Text
                  type="secondary"
                  style={{
                    fontSize: themeTokens.typography.fontSize.xs,
                    fontWeight: themeTokens.typography.fontWeight.normal,
                  }}
                >
                  Draft
                </Text>
                <Switch
                  size="small"
                  checked={isDraft}
                  onChange={setIsDraft}
                />
              </Flex>
            </Flex>
          </Flex>
        </div>

        {/* Board section - fills remaining space like play view */}
        <div className={styles.boardContainer}>
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={litUpHoldsMap}
            mirrored={false}
            onHoldClick={handleHoldClick}
            fillHeight
          />
        </div>

        {/* Hold counts bar at bottom */}
        <div className={styles.holdCountsBar}>
          <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
          <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
          <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total: {totalHolds}</Tag>
          {totalHolds > 0 && (
            <Button size="small" onClick={resetHolds}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to save your climb"
        description="Create an account or sign in to save your climb to the board."
      />
    </div>
  );
}
