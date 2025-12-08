'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Switch, Button, Typography, Flex, Space, Tag, Modal, Alert } from 'antd';
import { BulbOutlined, BulbFilled, ExperimentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import BoardRenderer from '../board-renderer/board-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { useBoardBluetooth } from '../board-bluetooth-control/use-board-bluetooth';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import '../board-bluetooth-control/send-climb-to-board-button.css';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface CreateClimbFormValues {
  name: string;
  description: string;
  isDraft: boolean;
}

interface CreateClimbFormProps {
  boardDetails: BoardDetails;
  angle: number;
}

export default function CreateClimbForm({ boardDetails, angle }: CreateClimbFormProps) {
  const router = useRouter();
  const { isAuthenticated, saveClimb, login } = useBoardProvider();
  const {
    litUpHoldsMap,
    handleHoldClick: originalHandleHoldClick,
    generateFramesString,
    startingCount,
    finishCount,
    totalHolds,
    isValid,
    resetHolds: originalResetHolds,
  } = useCreateClimb(boardDetails.board_name);

  const { isConnected, loading: bluetoothLoading, connect, sendFramesToBoard } = useBoardBluetooth({ boardDetails });

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

  // Handle Bluetooth connect button click
  const handleBluetoothConnect = useCallback(async () => {
    const frames = generateFramesString();
    await connect(frames);
  }, [connect, generateFramesString]);

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
    <div style={{ padding: '16px' }}>
      <Alert
        message="Beta Feature"
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        style={{ marginBottom: '16px' }}
        banner
      />

      <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          Create New Climb
        </Title>
        <Button
          type="default"
          icon={isConnected ? <BulbFilled className="connect-button-glow" /> : <BulbOutlined />}
          onClick={handleBluetoothConnect}
          loading={bluetoothLoading}
          title={isConnected ? 'Connected to board' : 'Connect to board for live preview'}
        >
          {isConnected ? 'Connected' : 'Connect Board'}
        </Button>
      </Flex>

      <Flex vertical gap={16}>
        {/* Board with clickable holds */}
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
            Tap holds to set their type. Tap again to cycle through types.
            {isConnected && ' Changes are shown live on the board.'}
          </Text>
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={litUpHoldsMap}
            mirrored={false}
            onHoldClick={handleHoldClick}
          />
        </div>

        {/* Hold counts */}
        <Flex gap={8} wrap="wrap" align="center">
          <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
          <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
          <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total holds: {totalHolds}</Tag>
          {totalHolds > 0 && (
            <Button size="small" onClick={resetHolds}>
              Clear All
            </Button>
          )}
        </Flex>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: '',
            description: '',
            isDraft: false,
          }}
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

          <Space style={{ width: '100%' }} direction="vertical">
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
          </Space>
        </Form>
      </Flex>

      {/* Aurora Login Modal */}
      <Modal
        title="Aurora Login Required"
        open={isLoginModalOpen}
        onCancel={handleLoginModalCancel}
        footer={null}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
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
