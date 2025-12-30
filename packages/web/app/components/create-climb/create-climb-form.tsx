'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Switch, Button, Typography, Tag, Alert, Space } from 'antd';
import { SettingOutlined, CloseOutlined } from '@ant-design/icons';
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
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);

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
        name: values.name || 'Untitled',
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
      // Redirect to settings
      router.push('/settings');
      return;
    }

    await doSaveClimb(values);
  };

  const handleAuthSuccess = useCallback(() => {
    // After successful auth, clear pending form values
    // The component will re-render with new auth state and user can click save again
    setPendingFormValues(null);
  }, []);

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

  const canSave = isAuthenticated && hasAuroraCredentials && isValid;
  const climbName = Form.useWatch('name', form);

  // Settings overlay content
  const settingsOverlay = showSettingsOverlay && (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: themeTokens.spacing[3],
        backgroundColor: themeTokens.semantic.surfaceOverlay,
        overflow: 'auto',
        zIndex: themeTokens.zIndex.dropdown,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: themeTokens.spacing[3] }}>
        <Text strong>Climb Settings</Text>
        <CloseOutlined
          onClick={() => setShowSettingsOverlay(false)}
          style={{ cursor: 'pointer', color: themeTokens.neutral[500] }}
        />
      </div>

      <Form.Item name="description" label="Description" style={{ marginBottom: themeTokens.spacing[3] }}>
        <TextArea placeholder="Optional description or beta" rows={3} maxLength={500} />
      </Form.Item>

      <Form.Item name="isDraft" label="Save as Draft" valuePropName="checked" style={{ marginBottom: 0 }}>
        <Switch />
      </Form.Item>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Board Section */}
        <div className={styles.boardSection}>
          <div style={{ position: 'relative' }}>
            <BoardRenderer
              boardDetails={boardDetails}
              litUpHoldsMap={litUpHoldsMap}
              mirrored={false}
              onHoldClick={handleHoldClick}
            />
            {settingsOverlay}
          </div>

          {/* Hold counts */}
          <div className={styles.holdCounts}>
            <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
            <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
            <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total holds: {totalHolds}</Tag>
            <Button size="small" onClick={resetHolds} disabled={totalHolds === 0}>
              Clear All
            </Button>
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

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              name: forkName ? `${forkName} fork` : '',
              description: '',
              isDraft: true,
            }}
            className={styles.formContent}
          >
            {/* Title with settings button */}
            <Form.Item
              name="name"
              style={{ marginBottom: themeTokens.spacing[3] }}
              rules={[{ required: true, message: 'Please enter a name for your climb' }]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Enter climb name"
                  maxLength={100}
                  style={{ flex: 1 }}
                />
                <Button
                  icon={showSettingsOverlay ? <CloseOutlined /> : <SettingOutlined />}
                  onClick={() => setShowSettingsOverlay(!showSettingsOverlay)}
                  title="Climb settings"
                />
              </Space.Compact>
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
