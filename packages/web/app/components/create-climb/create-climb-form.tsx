'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Switch, Button, Typography, Tag, Modal, Alert } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import BoardRenderer from '../board-renderer/board-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { useBoardBluetooth } from '../board-bluetooth-control/use-board-bluetooth';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '../board-renderer/util';
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
  const { isAuthenticated, saveClimb, login } = useBoardProvider();

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
  const [loginForm] = Form.useForm<{ username: string; password: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
      // Store the form values and show login modal
      setPendingFormValues(values);
      setIsLoginModalOpen(true);
      return;
    }

    await doSaveClimb(values);
  };

  const handleLogin = async (loginValues: { username: string; password: string }) => {
    setIsLoggingIn(true);
    try {
      await login(boardDetails.board_name, loginValues.username, loginValues.password);
      track('User Login Success', {
        boardLayout: boardDetails.layout_name || '',
        context: 'create_climb',
      });
      setIsLoginModalOpen(false);
      loginForm.resetFields();

      // If we have pending form values, save the climb now
      if (pendingFormValues) {
        await doSaveClimb(pendingFormValues);
        setPendingFormValues(null);
      }
    } catch (error) {
      console.error('Login failed:', error);
      track('User Login Failed', {
        boardLayout: boardDetails.layout_name || '',
        context: 'create_climb',
      });
    } finally {
      setIsLoggingIn(false);
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

  const handleLoginModalCancel = () => {
    setIsLoginModalOpen(false);
    setPendingFormValues(null);
    loginForm.resetFields();
  };

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
                disabled={!isValid || isSaving}
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

      {/* Aurora Login Modal */}
      <Modal
        title="Aurora Login Required"
        open={isLoginModalOpen}
        onCancel={handleLoginModalCancel}
        footer={null}
        destroyOnClose
      >
        <Text type="secondary" className={styles.modalDescription}>
          Please log in with your {boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1)}{' '}
          Board account to save your climb.
        </Text>
        <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isLoggingIn} block>
            {isLoggingIn ? 'Logging in...' : 'Login & Save Climb'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
