'use client';

import React, { useReducer, useCallback, useState } from 'react';
import { Upload, Button, Alert, Progress, Typography, Row, Col, Space, Result, message } from 'antd';
import { InboxOutlined, SaveOutlined, ClearOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { parseMultipleScreenshots, deduplicateClimbs } from '@boardsesh/moonboard-ocr/browser';
import type { MoonBoardClimb } from '@boardsesh/moonboard-ocr/browser';
import type { RcFile } from 'antd/es/upload/interface';
import MoonBoardImportCard from './moonboard-import-card';
import MoonBoardEditModal from './moonboard-edit-modal';
import { saveMoonBoardClimbs, convertOcrHoldsToMap } from '@/app/lib/moonboard-climbs-db';
import styles from './moonboard-bulk-import.module.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface MoonBoardBulkImportProps {
  layoutFolder: string;
  layoutName: string;
  holdSetImages: string[];
  angle: number;
}

// State and action types for the reducer
interface ImportState {
  status: 'idle' | 'processing' | 'complete';
  progress: { current: number; total: number; name: string };
  climbs: MoonBoardClimb[];
  errors: Array<{ name: string; error: string }>;
  editingClimb: MoonBoardClimb | null;
}

type ImportAction =
  | { type: 'START_PROCESSING'; total: number }
  | { type: 'UPDATE_PROGRESS'; current: number; total: number; name: string }
  | { type: 'COMPLETE'; climbs: MoonBoardClimb[]; errors: Array<{ name: string; error: string }> }
  | { type: 'REMOVE_CLIMB'; sourceFile: string }
  | { type: 'UPDATE_CLIMB'; sourceFile: string; climb: MoonBoardClimb }
  | { type: 'OPEN_EDIT'; climb: MoonBoardClimb }
  | { type: 'CLOSE_EDIT' }
  | { type: 'RESET' };

const initialState: ImportState = {
  status: 'idle',
  progress: { current: 0, total: 0, name: '' },
  climbs: [],
  errors: [],
  editingClimb: null,
};

function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'START_PROCESSING':
      return {
        ...state,
        status: 'processing',
        progress: { current: 0, total: action.total, name: '' },
        climbs: [],
        errors: [],
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: { current: action.current, total: action.total, name: action.name },
      };
    case 'COMPLETE':
      return {
        ...state,
        status: 'complete',
        climbs: action.climbs,
        errors: action.errors,
      };
    case 'REMOVE_CLIMB':
      return {
        ...state,
        climbs: state.climbs.filter((c) => c.sourceFile !== action.sourceFile),
      };
    case 'UPDATE_CLIMB':
      return {
        ...state,
        climbs: state.climbs.map((c) => (c.sourceFile === action.sourceFile ? action.climb : c)),
        editingClimb: null,
      };
    case 'OPEN_EDIT':
      return {
        ...state,
        editingClimb: action.climb,
      };
    case 'CLOSE_EDIT':
      return {
        ...state,
        editingClimb: null,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export default function MoonBoardBulkImport({
  layoutFolder,
  layoutName,
  holdSetImages,
  angle,
}: MoonBoardBulkImportProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(importReducer, initialState);
  const [isSaving, setIsSaving] = useState(false);

  const handleFilesUpload = useCallback(
    async (fileList: RcFile[]) => {
      if (fileList.length === 0) return;

      dispatch({ type: 'START_PROCESSING', total: fileList.length });

      const result = await parseMultipleScreenshots(fileList, (current, total, name) => {
        dispatch({ type: 'UPDATE_PROGRESS', current, total, name });
      });

      // Deduplicate climbs
      const uniqueClimbs = deduplicateClimbs(result.climbs);

      // Filter climbs by angle if needed (or just show warnings)
      const angleMismatchWarnings: Array<{ name: string; error: string }> = [];
      uniqueClimbs.forEach((climb) => {
        if (climb.angle !== angle) {
          angleMismatchWarnings.push({
            name: climb.sourceFile,
            error: `Angle mismatch: screenshot is ${climb.angle}°, current page is ${angle}°`,
          });
        }
      });

      dispatch({
        type: 'COMPLETE',
        climbs: uniqueClimbs,
        errors: [...result.errors, ...angleMismatchWarnings],
      });
    },
    [angle],
  );

  const handleSaveAll = useCallback(async () => {
    if (state.climbs.length === 0) return;

    setIsSaving(true);
    try {
      const newClimbs = state.climbs.map((climb) => ({
        name: climb.name,
        description: `Setter: ${climb.setter}\nGrade: ${climb.userGrade}${climb.isBenchmark ? '\n(Benchmark)' : ''}`,
        holds: climb.holds,
        angle: climb.angle,
        layoutFolder,
        createdAt: new Date().toISOString(),
        importedFrom: climb.sourceFile,
      }));

      await saveMoonBoardClimbs(newClimbs);

      message.success(`Successfully saved ${newClimbs.length} climb(s)`);
      dispatch({ type: 'RESET' });
      router.back();
    } catch (error) {
      console.error('Failed to save climbs:', error);
      message.error('Failed to save climbs. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [state.climbs, layoutFolder, router]);

  const handleRemoveClimb = useCallback((sourceFile: string) => {
    dispatch({ type: 'REMOVE_CLIMB', sourceFile });
  }, []);

  const handleEditClimb = useCallback((climb: MoonBoardClimb) => {
    dispatch({ type: 'OPEN_EDIT', climb });
  }, []);

  const handleSaveEdit = useCallback((updatedClimb: MoonBoardClimb) => {
    dispatch({ type: 'UPDATE_CLIMB', sourceFile: updatedClimb.sourceFile, climb: updatedClimb });
  }, []);

  const handleCloseEdit = useCallback(() => {
    dispatch({ type: 'CLOSE_EDIT' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Back
        </Button>
        <Title level={3} className={styles.title}>
          Import MoonBoard Climbs - {layoutName} @ {angle}°
        </Title>
      </div>

      {/* Upload Section */}
      {state.status === 'idle' && (
        <div className={styles.uploadSection}>
          <Dragger
            accept="image/png,image/jpeg,image/webp"
            multiple
            showUploadList={false}
            beforeUpload={(file, fileList) => {
              // Only process when all files are ready
              if (file === fileList[0]) {
                handleFilesUpload(fileList);
              }
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag screenshot files to this area</p>
            <p className="ant-upload-hint">
              Support for MoonBoard app screenshots. Drop multiple files to bulk import.
            </p>
          </Dragger>
        </div>
      )}

      {/* Processing Section */}
      {state.status === 'processing' && (
        <div className={styles.processingSection}>
          <Title level={4}>Processing Screenshots...</Title>
          <Progress
            percent={Math.round((state.progress.current / state.progress.total) * 100)}
            status="active"
          />
          <Text type="secondary">
            {state.progress.current} / {state.progress.total}: {state.progress.name}
          </Text>
        </div>
      )}

      {/* Results Section */}
      {state.status === 'complete' && (
        <>
          {/* Errors */}
          {state.errors.length > 0 && (
            <Alert
              title={`${state.errors.length} Warning(s)`}
              description={
                <ul className={styles.errorList}>
                  {state.errors.map((err, i) => (
                    <li key={i}>
                      <strong>{err.name}:</strong> {err.error}
                    </li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
              closable
              className={styles.errorAlert}
            />
          )}

          {/* Success Summary */}
          {state.climbs.length > 0 && (
            <Alert
              title={`${state.climbs.length} climb(s) ready to import`}
              description="Review the climbs below. You can edit or remove any before saving."
              type="success"
              showIcon
              className={styles.successAlert}
            />
          )}

          {/* Action Buttons */}
          {state.climbs.length > 0 && (
            <div className={styles.actions}>
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAll}
                  size="large"
                  loading={isSaving}
                  disabled={isSaving}
                >
                  Save All ({state.climbs.length})
                </Button>
                <Button icon={<ClearOutlined />} onClick={handleReset}>
                  Clear & Start Over
                </Button>
              </Space>
            </div>
          )}

          {/* Climb Cards Grid */}
          {state.climbs.length > 0 ? (
            <Row gutter={[16, 16]} className={styles.climbGrid}>
              {state.climbs.map((climb) => (
                <Col key={climb.sourceFile} xs={24} sm={12} md={8} lg={6}>
                  <MoonBoardImportCard
                    climb={climb}
                    layoutFolder={layoutFolder}
                    holdSetImages={holdSetImages}
                    litUpHoldsMap={convertOcrHoldsToMap(climb.holds)}
                    onEdit={() => handleEditClimb(climb)}
                    onRemove={() => handleRemoveClimb(climb.sourceFile)}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Result
              status="warning"
              title="No climbs could be imported"
              subTitle="Please check the errors above and try again with different screenshots."
              extra={
                <Button onClick={handleReset} type="primary">
                  Try Again
                </Button>
              }
            />
          )}
        </>
      )}

      {/* Edit Modal */}
      {state.editingClimb && (
        <MoonBoardEditModal
          open={!!state.editingClimb}
          climb={state.editingClimb}
          layoutFolder={layoutFolder}
          holdSetImages={holdSetImages}
          onSave={handleSaveEdit}
          onCancel={handleCloseEdit}
        />
      )}
    </div>
  );
}
