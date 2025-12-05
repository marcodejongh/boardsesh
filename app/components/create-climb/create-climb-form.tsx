'use client';

import React, { useState } from 'react';
import { Form, Input, Switch, Button, Typography, Flex, Space, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import BoardRenderer from '../board-renderer/board-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';

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
  const { isAuthenticated, saveClimb } = useBoardProvider();
  const {
    litUpHoldsMap,
    handleHoldClick,
    generateFramesString,
    startingCount,
    finishCount,
    totalHolds,
    isValid,
    resetHolds,
  } = useCreateClimb(boardDetails.board_name);

  const [form] = Form.useForm<CreateClimbFormValues>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (values: CreateClimbFormValues) => {
    if (!isValid) {
      return;
    }

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

  const handleCancel = () => {
    const listUrl = constructClimbListWithSlugs(
      boardDetails.board_name,
      boardDetails.layout_name || '',
      boardDetails.size_name || '',
      boardDetails.set_names || [],
      angle,
    );
    router.push(listUrl);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Title level={4}>Please log in to create climbs</Title>
        <Text type="secondary">You need to be logged in to create and save climbs.</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={4} style={{ marginBottom: '16px' }}>
        Create New Climb
      </Title>

      <Flex vertical gap={16}>
        {/* Board with clickable holds */}
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
            Tap holds to set their type. Tap again to cycle through types.
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
    </div>
  );
}
