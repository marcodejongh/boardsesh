'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Switch, Button, Typography, Tag, Alert, Flex } from 'antd';
import type { InputRef } from 'antd';
import { SettingOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import BoardRenderer from '../board-renderer/board-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { useBoardBluetooth } from '../board-bluetooth-control/use-board-bluetooth';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '../board-renderer/util';
import AuthModal from '../auth/auth-modal';
import { useCreateClimbContext } from './create-climb-context';
import { useDrafts, DraftClimb } from '../drafts/drafts-context';
import { getDraftClimb } from '@/app/lib/draft-climbs-db';
import styles from './create-climb-form.module.css';

const { Text } = Typography;
const { TextArea } = Input;

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
  const searchParams = useSearchParams();
  const draftIdFromUrl = searchParams.get('draftId');
  const { isAuthenticated, saveClimb } = useBoardProvider();
  const { createDraft, updateDraft, deleteDraft } = useDrafts();

  const [currentDraft, setCurrentDraft] = useState<DraftClimb | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(!!draftIdFromUrl);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

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
    setLitUpHoldsMap,
  } = useCreateClimb(boardDetails.board_name, { initialHoldsMap });

  const { isConnected, sendFramesToBoard } = useBoardBluetooth({ boardDetails });
  const createClimbContext = useCreateClimbContext();

  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CreateClimbFormValues | null>(null);

  // Editable title state
  const [climbName, setClimbName] = useState(forkName ? `${forkName} fork` : '');
  const [description, setDescription] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const titleInputRef = useRef<InputRef>(null);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load existing draft or create a new one on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initializeDraft = async () => {
      try {
        if (draftIdFromUrl) {
          // Resuming an existing draft
          const existingDraft = await getDraftClimb(draftIdFromUrl);
          if (!isMountedRef.current) return;

          if (existingDraft) {
            setCurrentDraft(existingDraft);
            // Restore form values
            setClimbName(existingDraft.name);
            setDescription(existingDraft.description);
            setIsDraft(existingDraft.isDraft);
            // Restore holds map
            if (Object.keys(existingDraft.litUpHoldsMap).length > 0) {
              setLitUpHoldsMap(existingDraft.litUpHoldsMap);
            }
          }
          setIsLoadingDraft(false);
        } else {
          // Create a new draft immediately
          const newDraft = await createDraft({
            boardName: boardDetails.board_name,
            layoutId: boardDetails.layout_id,
            sizeId: boardDetails.size_id,
            setIds: boardDetails.set_ids,
            angle,
            layoutName: boardDetails.layout_name,
            sizeName: boardDetails.size_name,
            sizeDescription: boardDetails.size_description,
            setNames: boardDetails.set_names,
          });
          if (!isMountedRef.current) return;

          setCurrentDraft(newDraft);
          setIsLoadingDraft(false);
          // Update URL with draft ID (without navigation)
          const url = new URL(window.location.href);
          url.searchParams.set('draftId', newDraft.uuid);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (error) {
        console.error('Failed to initialize draft:', error);
        if (isMountedRef.current) {
          setIsLoadingDraft(false);
        }
      }
    };

    initializeDraft();
  }, [draftIdFromUrl, boardDetails, angle, createDraft, setLitUpHoldsMap]);

  // Use ref for draft UUID to avoid triggering saves when currentDraft reference changes
  const currentDraftIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentDraftIdRef.current = currentDraft?.uuid ?? null;
  }, [currentDraft]);

  // Debounced auto-save when form data changes
  useEffect(() => {
    // Skip if not initialized or loading
    if (!currentDraftIdRef.current || isLoadingDraft) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!currentDraftIdRef.current || !isMountedRef.current) return;

      const frames = generateFramesString();

      try {
        await updateDraft(currentDraftIdRef.current, {
          name: climbName || '',
          description: description || '',
          frames,
          litUpHoldsMap,
          isDraft,
          angle,
        });
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [litUpHoldsMap, climbName, description, isDraft, isLoadingDraft, generateFramesString, updateDraft, angle]);

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
    const trimmedName = editingName.trim();
    // Only update if we have a valid name, otherwise keep the original
    if (trimmedName) {
      setClimbName(trimmedName);
    }
    // Always exit edit mode and clear the editing state
    setIsEditingTitle(false);
    setEditingName('');
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

  const doSaveClimb = useCallback(async () => {
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

      // Delete the local draft after successful save
      if (currentDraft) {
        try {
          await deleteDraft(currentDraft.uuid);
        } catch (error) {
          console.error('Failed to delete draft after save:', error);
        }
      }

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
  }, [generateFramesString, saveClimb, boardDetails, climbName, description, isDraft, angle, totalHolds, router, currentDraft, deleteDraft]);

  const handlePublish = useCallback(async () => {
    if (!isValid || !climbName.trim()) {
      return;
    }

    if (!isAuthenticated) {
      // Store the form values and show auth modal
      setPendingFormValues({ name: climbName, description, isDraft });
      setShowAuthModal(true);
      return;
    }

    await doSaveClimb();
  }, [isValid, climbName, isAuthenticated, description, isDraft, doSaveClimb]);

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

  const handleCancel = useCallback(async () => {
    // Delete the current draft when canceling
    if (currentDraft) {
      try {
        await deleteDraft(currentDraft.uuid);
      } catch (error) {
        console.error('Failed to delete draft on cancel:', error);
      }
    }

    const listUrl = constructClimbListWithSlugs(
      boardDetails.board_name,
      boardDetails.layout_name || '',
      boardDetails.size_name || '',
      boardDetails.size_description,
      boardDetails.set_names || [],
      angle,
    );
    router.push(listUrl);
  }, [boardDetails, angle, router, currentDraft, deleteDraft]);

  const canSave = isAuthenticated && isValid && climbName.trim().length > 0;

  const handleToggleSettings = useCallback(() => {
    setShowSettingsPanel((prev) => !prev);
  }, []);

  // Register actions with context for header to use
  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.registerActions({
        onPublish: handlePublish,
        onCancel: handleCancel,
      });
    }
  }, [createClimbContext, handlePublish, handleCancel]);

  // Update context state
  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.setCanPublish(canSave);
    }
  }, [createClimbContext, canSave]);

  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.setIsPublishing(isSaving);
    }
  }, [createClimbContext, isSaving]);

  return (
    <div className={styles.pageContainer}>
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

      {/* Main Content - matches play view layout */}
      <div className={styles.contentWrapper}>
        {/* Title section - same position as play view */}
        <div className={styles.climbTitleContainer}>
          <Flex gap={12} align="center">
            {/* Left side: Editable Name and draft toggle stacked */}
            <Flex vertical gap={0} className={styles.titleWrapper}>
              {/* Row 1: Editable Title */}
              {isEditingTitle ? (
                <Flex gap={4} align="center">
                  <Input
                    ref={titleInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleSaveTitle}
                    maxLength={100}
                    placeholder="Enter climb name"
                    size="small"
                    className={styles.titleInput}
                  />
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSaveTitle();
                    }}
                  />
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCancelEditTitle();
                    }}
                  />
                </Flex>
              ) : (
                <Flex gap={4} align="center">
                  <div
                    className={styles.editableTitle}
                    onClick={handleStartEditTitle}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartEditTitle()}
                  >
                    <Text className={styles.titleText}>
                      {climbName || 'Tap to name your climb'}
                    </Text>
                    <EditOutlined className={styles.editIcon} />
                  </div>
                  <Button
                    type="text"
                    icon={showSettingsPanel ? <CloseOutlined /> : <SettingOutlined />}
                    size="small"
                    onClick={handleToggleSettings}
                    className={styles.settingsButton}
                  />
                </Flex>
              )}
              {/* Row 2: Draft toggle */}
              <Flex gap={8} align="center">
                <Text type="secondary" className={styles.draftLabel}>
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

          {/* Settings overlay panel */}
          {showSettingsPanel && (
            <div
              className={styles.settingsPanel}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.settingsPanelHeader}>
                <Text strong>Climb Settings</Text>
              </div>
              <div className={styles.settingsPanelContent}>
                <div className={styles.settingsField}>
                  <Text type="secondary" className={styles.settingsLabel}>
                    Description (optional)
                  </Text>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add beta or notes about your climb..."
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hold counts bar at bottom */}
        <div className={styles.holdCountsBar}>
          <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
          <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
          <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total: {totalHolds}</Tag>
          <Button size="small" onClick={resetHolds} disabled={totalHolds === 0}>
            Clear All
          </Button>
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
