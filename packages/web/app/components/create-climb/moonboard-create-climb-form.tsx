'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Typography, Tag, Alert } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useMoonBoardCreateClimb } from './use-moonboard-create-climb';
import { holdIdToCoordinate } from '@/app/lib/moonboard-config';
import styles from './create-climb-form.module.css';

const { TextArea } = Input;
const { Text } = Typography;

interface MoonBoardCreateClimbFormValues {
  name: string;
  description: string;
}

interface MoonBoardCreateClimbFormProps {
  layoutFolder: string;
  layoutName: string;
  holdSetImages: string[];
  angle: number;
}

export default function MoonBoardCreateClimbForm({
  layoutFolder,
  layoutName,
  holdSetImages,
  angle,
}: MoonBoardCreateClimbFormProps) {
  const router = useRouter();

  const {
    litUpHoldsMap,
    handleHoldClick,
    startingCount,
    finishCount,
    handCount,
    totalHolds,
    isValid,
    resetHolds,
  } = useMoonBoardCreateClimb();

  const [form] = Form.useForm<MoonBoardCreateClimbFormValues>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (values: MoonBoardCreateClimbFormValues) => {
    if (!isValid) {
      return;
    }

    setIsSaving(true);

    try {
      // Convert holds to coordinate format for storage
      const holds = {
        start: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.type === 'start')
          .map(([id]) => holdIdToCoordinate(Number(id))),
        hand: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.type === 'hand')
          .map(([id]) => holdIdToCoordinate(Number(id))),
        finish: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.type === 'finish')
          .map(([id]) => holdIdToCoordinate(Number(id))),
      };

      const climbData = {
        name: values.name,
        description: values.description || '',
        holds,
        angle,
        layoutFolder,
        createdAt: new Date().toISOString(),
      };

      // For now, save to localStorage (database integration coming later)
      const existingClimbs = JSON.parse(localStorage.getItem('moonboard_climbs') || '[]');
      existingClimbs.push(climbData);
      localStorage.setItem('moonboard_climbs', JSON.stringify(existingClimbs));

      console.log('MoonBoard climb saved:', climbData);
      setSaveSuccess(true);

      // Reset the form and holds
      form.resetFields();
      resetHolds();

      // Show success briefly then allow another climb to be created
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save climb:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className={styles.pageContainer}>
      <Alert
        message={`MoonBoard Beta - ${layoutName} @ ${angle}°`}
        description="MoonBoard support is in beta. Climbs are saved locally for now. Database sync coming soon!"
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        className={styles.betaBanner}
        banner
      />

      {saveSuccess && (
        <Alert
          message="Climb saved successfully!"
          description="Your climb has been saved locally. You can create another climb."
          type="success"
          showIcon
          closable
          className={styles.betaBanner}
        />
      )}

      <div className={styles.contentWrapper}>
        {/* Board Section */}
        <div className={styles.boardSection}>
          <MoonBoardRenderer
            layoutFolder={layoutFolder}
            holdSetImages={holdSetImages}
            litUpHoldsMap={litUpHoldsMap}
            onHoldClick={handleHoldClick}
          />

          {/* Hold counts */}
          <div className={styles.holdCounts}>
            <Tag color={startingCount > 0 ? 'red' : 'default'}>Start: {startingCount}/2</Tag>
            <Tag color={handCount > 0 ? 'blue' : 'default'}>Hand: {handCount}</Tag>
            <Tag color={finishCount > 0 ? 'green' : 'default'}>Finish: {finishCount}/2</Tag>
            <Tag color={totalHolds > 0 ? 'purple' : 'default'}>Total: {totalHolds}</Tag>
            {totalHolds > 0 && (
              <Button size="small" onClick={resetHolds}>
                Clear All
              </Button>
            )}
          </div>

          {!isValid && totalHolds > 0 && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              A valid climb needs at least 1 start hold and 1 finish hold
            </Text>
          )}
        </div>

        {/* Form Section */}
        <div className={styles.formSection}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              name: '',
              description: '',
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

            <div className={styles.buttonGroup}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSaving}
                disabled={!isValid || isSaving}
                block
                size="large"
              >
                {isSaving ? 'Saving...' : 'Save Climb (Local)'}
              </Button>

              <Button block size="large" onClick={handleCancel} disabled={isSaving}>
                Back
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
