'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Typography, Tag, Alert, Upload, message } from 'antd';
import { ExperimentOutlined, UploadOutlined, LoadingOutlined, ImportOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useMoonBoardCreateClimb } from './use-moonboard-create-climb';
import { holdIdToCoordinate } from '@/app/lib/moonboard-config';
import { parseScreenshot } from '@boardsesh/moonboard-ocr/browser';
import { saveMoonBoardClimb, convertOcrHoldsToMap } from '@/app/lib/moonboard-climbs-db';
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
  const pathname = usePathname();

  // Construct the bulk import URL (replace /create with /import)
  const bulkImportUrl = pathname.replace(/\/create$/, '/import');

  const {
    litUpHoldsMap,
    setLitUpHoldsMap,
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

  // OCR import state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);

  const handleOcrImport = async (file: File) => {
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrWarnings([]);

    try {
      const result = await parseScreenshot(file);

      if (!result.success || !result.climb) {
        setOcrError(result.error || 'Failed to parse screenshot');
        return;
      }

      const climb = result.climb;
      const warnings = [...result.warnings];

      // Check angle mismatch
      if (climb.angle !== angle) {
        warnings.push(`Screenshot is for ${climb.angle}° but current page is ${angle}°. Holds imported anyway.`);
      }

      setOcrWarnings(warnings);

      // Convert OCR holds to form state
      const newHoldsMap = convertOcrHoldsToMap(climb.holds);
      setLitUpHoldsMap(newHoldsMap);

      // Build description with setter info
      const descriptionParts: string[] = [];
      if (climb.setter) descriptionParts.push(`Setter: ${climb.setter}`);
      if (climb.userGrade) descriptionParts.push(`Grade: ${climb.userGrade}`);
      if (climb.isBenchmark) descriptionParts.push('(Benchmark)');

      // Populate form fields
      form.setFieldsValue({
        name: climb.name || '',
        description: descriptionParts.join('\n'),
      });
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : 'Unknown error during OCR');
    } finally {
      setIsOcrProcessing(false);
    }
  };

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

      await saveMoonBoardClimb(climbData);

      message.success('Climb saved successfully!');
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
      message.error('Failed to save climb. Please try again.');
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
        title={`MoonBoard Beta - ${layoutName} @ ${angle}°`}
        description="MoonBoard support is in beta. Climbs are saved locally for now. Database sync coming soon!"
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        className={styles.betaBanner}
        banner
      />

      {saveSuccess && (
        <Alert
          title="Climb saved successfully!"
          description="Your climb has been saved locally. You can create another climb."
          type="success"
          showIcon
          closable
          className={styles.betaBanner}
        />
      )}

      {ocrError && (
        <Alert
          title="Import Failed"
          description={ocrError}
          type="error"
          showIcon
          closable
          onClose={() => setOcrError(null)}
          className={styles.betaBanner}
        />
      )}

      {ocrWarnings.length > 0 && (
        <Alert
          title="Import Warnings"
          description={ocrWarnings.map((w, i) => <div key={i}>{w}</div>)}
          type="warning"
          showIcon
          closable
          onClose={() => setOcrWarnings([])}
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

          {/* Import from Screenshot */}
          <div className={styles.holdCounts}>
            <Upload
              accept="image/png,image/jpeg,image/webp"
              showUploadList={false}
              beforeUpload={(file) => {
                handleOcrImport(file);
                return false; // Prevent default upload behavior
              }}
              disabled={isOcrProcessing}
            >
              <Button icon={isOcrProcessing ? <LoadingOutlined /> : <UploadOutlined />} disabled={isOcrProcessing}>
                {isOcrProcessing ? 'Processing...' : 'Import Screenshot'}
              </Button>
            </Upload>
            <Link href={bulkImportUrl}>
              <Button icon={<ImportOutlined />}>Bulk Import</Button>
            </Link>
          </div>

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
            <Text type="secondary" className={styles.validationHint}>
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
