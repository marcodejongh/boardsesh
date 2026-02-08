'use client';

import React, { useReducer, useCallback, useState, useRef } from 'react';
import { Upload, Alert, Progress, Result, message, Checkbox } from 'antd';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { InboxOutlined, SaveOutlined, ClearOutlined, ArrowBackOutlined, LoginOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { parseMultipleScreenshots, deduplicateClimbs } from '@boardsesh/moonboard-ocr/browser';
import type { MoonBoardClimb } from '@boardsesh/moonboard-ocr/browser';
import type { RcFile } from 'antd/es/upload/interface';
import MoonBoardImportCard from './moonboard-import-card';
import MoonBoardEditModal from './moonboard-edit-modal';
import { convertOcrHoldsToMap } from '@/app/lib/moonboard-climbs-db';
import { useBackendUrl } from '@/app/components/connection-manager/connection-settings-context';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { uploadOcrTestDataBatch } from '@/app/lib/moonboard-ocr-upload';
import styles from './moonboard-bulk-import.module.css';

const { Dragger } = Upload;

interface MoonBoardBulkImportProps {
  layoutFolder: string;
  layoutName: string;
  layoutId: number;
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
  layoutId,
  holdSetImages,
  angle,
}: MoonBoardBulkImportProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [state, dispatch] = useReducer(importReducer, initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [contributeImages, setContributeImages] = useState(true);

  // Store original files for OCR test data upload
  const filesMapRef = useRef<Map<string, File>>(new Map());

  // Backend URL and auth token for OCR upload
  const { backendUrl } = useBackendUrl();
  const { token: authToken } = useWsAuthToken();

  const handleFilesUpload = useCallback(
    async (fileList: RcFile[]) => {
      if (fileList.length === 0) return;

      // Store files for potential OCR test data upload
      filesMapRef.current = new Map();
      for (const file of fileList) {
        filesMapRef.current.set(file.name, file);
      }

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

    const userId = session?.user?.id;
    if (!userId) {
      message.error('Please log in to save climbs');
      return;
    }

    setIsSaving(true);
    try {
      let savedCount = 0;
      const errors: string[] = [];
      const savedClimbs: MoonBoardClimb[] = [];

      // Save each climb individually to the database
      for (const climb of state.climbs) {
        try {
          const response = await fetch('/api/v1/moonboard/proxy/saveClimb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              options: {
                layout_id: layoutId,
                user_id: userId,
                name: climb.name,
                description: `Setter: ${climb.setter}\nGrade: ${climb.userGrade}${climb.isBenchmark ? '\n(Benchmark)' : ''}`,
                holds: climb.holds,
                angle: climb.angle,
                setter: climb.setter,
                user_grade: climb.userGrade,
                is_benchmark: climb.isBenchmark,
              },
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            errors.push(`${climb.name}: ${errorData.error || 'Failed to save'}`);
          } else {
            savedCount++;
            savedClimbs.push(climb);
          }
        } catch {
          errors.push(`${climb.name}: Network error`);
        }
      }

      if (savedCount > 0) {
        message.success(`Successfully saved ${savedCount} climb(s) to database`);

        // Fire-and-forget: upload OCR test data if opted in
        if (contributeImages && backendUrl && authToken && savedClimbs.length > 0) {
          // Don't await - fire and forget
          uploadOcrTestDataBatch(backendUrl, filesMapRef.current, savedClimbs, layoutId, angle, authToken).catch(
            (err) => {
              console.warn('[OCR Upload] Background upload failed:', err);
            },
          );
        }
      }
      if (errors.length > 0) {
        message.warning(`Failed to save ${errors.length} climb(s)`);
        console.error('Save errors:', errors);
      }

      if (savedCount > 0) {
        dispatch({ type: 'RESET' });
        filesMapRef.current = new Map();
        router.back();
      }
    } catch (error) {
      console.error('Failed to save climbs:', error);
      message.error('Failed to save climbs. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [state.climbs, layoutId, session, router, contributeImages, backendUrl, authToken, angle]);

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
    filesMapRef.current = new Map();
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MuiButton variant="outlined" startIcon={<ArrowBackOutlined />} onClick={handleBack}>
          Back
        </MuiButton>
        <Typography variant="h3" className={styles.title}>
          Import MoonBoard Climbs - {layoutName} @ {angle}°
        </Typography>
      </div>

      {!session?.user && (
        <Alert
          title="Login Required"
          description={
            <>
              Please log in to save climbs to the database.{' '}
              <Link href="/api/auth/signin">
                <MuiButton variant="text" startIcon={<LoginOutlined />} sx={{ padding: 0 }}>
                  Log in
                </MuiButton>
              </Link>
            </>
          }
          type="warning"
          showIcon
          className={styles.warningAlert}
          banner
        />
      )}

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
          <Typography variant="h4">Processing Screenshots...</Typography>
          <Progress
            percent={Math.round((state.progress.current / state.progress.total) * 100)}
            status="active"
          />
          <Typography variant="body2" component="span" color="text.secondary">
            {state.progress.current} / {state.progress.total}: {state.progress.name}
          </Typography>
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
              <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                  <MuiButton
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={16} /> : <SaveOutlined />}
                    onClick={handleSaveAll}
                    size="large"
                    disabled={isSaving || !session?.user}
                  >
                    Save All ({state.climbs.length})
                  </MuiButton>
                  <MuiButton variant="outlined" startIcon={<ClearOutlined />} onClick={handleReset}>
                    Clear & Start Over
                  </MuiButton>
                </Stack>
                {backendUrl && (
                  <Checkbox checked={contributeImages} onChange={(e) => setContributeImages(e.target.checked)}>
                    Contribute images to improve OCR accuracy
                  </Checkbox>
                )}
              </Stack>
            </div>
          )}

          {/* Climb Cards Grid */}
          {state.climbs.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }} className={styles.climbGrid}>
              {state.climbs.map((climb) => (
                <Box key={climb.sourceFile} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%', lg: '25%' }, boxSizing: 'border-box' }}>
                  <MoonBoardImportCard
                    climb={climb}
                    layoutFolder={layoutFolder}
                    holdSetImages={holdSetImages}
                    litUpHoldsMap={convertOcrHoldsToMap(climb.holds)}
                    onEdit={() => handleEditClimb(climb)}
                    onRemove={() => handleRemoveClimb(climb.sourceFile)}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Result
              status="warning"
              title="No climbs could be imported"
              subTitle="Please check the errors above and try again with different screenshots."
              extra={
                <MuiButton onClick={handleReset} variant="contained">
                  Try Again
                </MuiButton>
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
