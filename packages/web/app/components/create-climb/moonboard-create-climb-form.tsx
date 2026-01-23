'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Typography, Tag, Alert, Upload, message, Space } from 'antd';
import { UploadOutlined, LoadingOutlined, ImportOutlined, LoginOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useMoonBoardCreateClimb } from './use-moonboard-create-climb';
import { holdIdToCoordinate } from '@/app/lib/moonboard-config';
import { parseScreenshot } from '@boardsesh/moonboard-ocr/browser';
import { convertOcrHoldsToMap } from '@/app/lib/moonboard-climbs-db';
import styles from './create-climb-form.module.css';

const { TextArea } = Input;
const { Text } = Typography;

interface MoonBoardCreateClimbFormValues {
  name: string;
  description: string;
}

interface MoonBoardCreateClimbFormProps {
  layoutFolder: string;
  layoutId: number;
  holdSetImages: string[];
  angle: number;
}

export default function MoonBoardCreateClimbForm({
  layoutFolder,
  layoutId,
  holdSetImages,
  angle,
}: MoonBoardCreateClimbFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

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

    if (!session?.user?.id) {
      message.error('Please log in to save climbs');
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

      const response = await fetch('/api/v1/moonboard/proxy/saveClimb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            layout_id: layoutId,
            user_id: session.user.id,
            name: values.name,
            description: values.description || '',
            holds,
            angle,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save climb');
      }

      message.success('Climb saved to database!');

      // Navigate back to the list
      const listUrl = pathname.replace(/\/create$/, '/list');
      router.push(listUrl);
    } catch (error) {
      console.error('Failed to save climb:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save climb. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header with Back and Save buttons */}
      <div className={styles.createHeader}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          Back
        </Button>
        <Form form={form} component={false}>
          <Form.Item name="name" noStyle>
            <Input
              placeholder="Climb name"
              maxLength={100}
              className={styles.headerNameInput}
              variant="borderless"
            />
          </Form.Item>
        </Form>
        {!session?.user ? (
          <Link href="/api/auth/signin">
            <Button type="primary" icon={<LoginOutlined />}>
              Log in to Save
            </Button>
          </Link>
        ) : (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isSaving}
            disabled={!isValid || isSaving}
            onClick={() => form.submit()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {ocrError && (
        <Alert
          message="Import Failed"
          description={ocrError}
          type="error"
          showIcon
          closable
          onClose={() => setOcrError(null)}
          className={styles.alertBanner}
        />
      )}

      {ocrWarnings.length > 0 && (
        <Alert
          message="Import Warnings"
          description={ocrWarnings.map((w, i) => <div key={i}>{w}</div>)}
          type="warning"
          showIcon
          closable
          onClose={() => setOcrWarnings([])}
          className={styles.alertBanner}
        />
      )}

      <div className={styles.contentWrapper}>
        {/* Board Section */}
        <div className={styles.boardContainer}>
          <MoonBoardRenderer
            layoutFolder={layoutFolder}
            holdSetImages={holdSetImages}
            litUpHoldsMap={litUpHoldsMap}
            onHoldClick={handleHoldClick}
          />
        </div>
      </div>

      {/* Bottom bar with hold counts and actions */}
      <div className={styles.holdCountsBar}>
        <Space wrap size="small">
          <Tag color={startingCount > 0 ? 'red' : 'default'}>Start: {startingCount}/2</Tag>
          <Tag color={handCount > 0 ? 'blue' : 'default'}>Hand: {handCount}</Tag>
          <Tag color={finishCount > 0 ? 'green' : 'default'}>Finish: {finishCount}/2</Tag>
          <Tag color={totalHolds > 0 ? 'purple' : 'default'}>Total: {totalHolds}</Tag>
        </Space>
        <Space wrap size="small">
          {totalHolds > 0 && (
            <Button size="small" onClick={resetHolds}>
              Clear
            </Button>
          )}
          <Upload
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={(file) => {
              handleOcrImport(file);
              return false;
            }}
            disabled={isOcrProcessing}
          >
            <Button size="small" icon={isOcrProcessing ? <LoadingOutlined /> : <UploadOutlined />} disabled={isOcrProcessing}>
              {isOcrProcessing ? 'Processing...' : 'Import'}
            </Button>
          </Upload>
          <Link href={bulkImportUrl}>
            <Button size="small" icon={<ImportOutlined />}>Bulk</Button>
          </Link>
        </Space>
      </div>

      {!isValid && totalHolds > 0 && (
        <div className={styles.validationBar}>
          <Text type="secondary">
            A valid climb needs at least 1 start hold and 1 finish hold
          </Text>
        </div>
      )}

      {/* Hidden form for submission */}
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={{ name: '', description: '' }}
        style={{ display: 'none' }}
      >
        <Form.Item name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description">
          <TextArea />
        </Form.Item>
      </Form>
    </div>
  );
}
