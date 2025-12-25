'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Switch, Button, Typography, Tag, Alert } from 'antd';
import { ExperimentOutlined, SettingOutlined } from '@ant-design/icons';
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
import styles from './create-climb-form.module.css';

const { TextArea } = Input;
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

  const [form] = Form.useForm<CreateClimbFormValues>();
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CreateClimbFormValues | null>(null);

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

  const doSaveClimb = async (values: CreateClimbFormValues) => {
    setIsSaving(true);

    try {
      const frames = generateFramesString();

      await saveClimb({
        layout_id: boardDetails.layout_id,
        name: values.name,
        description: values.description || '',
        is_draft: values.isDraft,
        frames,
        frames_count: 1,
        frames_pace: 0,
        angle,
      });

      track('Climb Created', {
        boardLayout: boardDetails.layout_name || '',
        isDraft: values.isDraft,
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

  const handleSubmit = async (values: CreateClimbFormValues) => {
    if (!isValid) {
      return;
    }

    if (!isAuthenticated) {
      // Store the form values and show auth modal
      setPendingFormValues(values);
      setShowAuthModal(true);
      return;
    }

    if (!hasAuroraCredentials) {
      // User is logged in but hasn't linked their Aurora account
      // This shouldn't happen due to the UI, but handle it gracefully
      return;
    }

    await doSaveClimb(values);
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
  const canSave = isAuthenticated && hasAuroraCredentials && isValid;

  return (
    <div className={styles.pageContainer}>
      <Alert
        message="Beta Feature"
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        className={styles.betaBanner}
        banner
      />

      <div className={styles.contentWrapper}>
        {/* Board Section */}
        <div className={styles.boardSection}>
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={litUpHoldsMap}
            mirrored={false}
            onHoldClick={handleHoldClick}
          />

          {/* Hold counts */}
          <div className={styles.holdCounts}>
            <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
            <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
            <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total holds: {totalHolds}</Tag>
            {totalHolds > 0 && (
              <Button size="small" onClick={resetHolds}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className={styles.formSection}>
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

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              name: forkName ? `${forkName} fork` : '',
              description: '',
              isDraft: false,
            }}
            className={styles.formContent}
          >
            <Form.Item
              name="name"
              label="Climb Name"
              rules={[{ required: true, message: 'Please enter a name for your climb' }]}
            >
              <Input placeholder="Enter climb name" maxLength={100} />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <TextArea placeholder="Optional description or beta" rows={3} maxLength={500} />
            </Form.Item>

            <Form.Item name="isDraft" label="Save as Draft" valuePropName="checked">
              <Switch />
            </Form.Item>

            <div className={styles.buttonGroup}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSaving}
                disabled={!canSave || isSaving}
                block
                size="large"
              >
                {isSaving ? 'Saving...' : 'Save Climb'}
              </Button>

              <Button block size="large" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </Form>
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
