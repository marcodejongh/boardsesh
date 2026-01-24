'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Switch, Button, Typography, Tag, Alert, Flex, Slider, Tooltip, Space, Upload, message, Select } from 'antd';
import { SettingOutlined, CloseOutlined, FireOutlined, ArrowLeftOutlined, SaveOutlined, LoginOutlined, UploadOutlined, LoadingOutlined, ImportOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import BoardRenderer from '../board-renderer/board-renderer';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useCreateClimb } from './use-create-climb';
import { useMoonBoardCreateClimb } from './use-moonboard-create-climb';
import { useBoardBluetooth } from '../board-bluetooth-control/use-board-bluetooth';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '../board-renderer/util';
import { holdIdToCoordinate, MOONBOARD_GRADES, MOONBOARD_ANGLES } from '@/app/lib/moonboard-config';
import { getFontGradeColor } from '@/app/lib/grade-colors';
import { themeTokens } from '@/app/theme/theme-config';
import { parseScreenshot } from '@boardsesh/moonboard-ocr/browser';
import { convertOcrHoldsToMap } from '@/app/lib/moonboard-climbs-db';
import AuthModal from '../auth/auth-modal';
import { useCreateClimbContext } from './create-climb-context';
import CreateClimbHeatmapOverlay from './create-climb-heatmap-overlay';
import styles from './create-climb-form.module.css';

const { Text } = Typography;
const { TextArea } = Input;

interface CreateClimbFormValues {
  name: string;
  description: string;
  isDraft: boolean;
}

type BoardType = 'aurora' | 'moonboard';

interface CreateClimbFormProps {
  boardType: BoardType;
  angle: number;
  // Aurora-specific
  boardDetails?: BoardDetails;
  forkFrames?: string;
  forkName?: string;
  // MoonBoard-specific
  layoutFolder?: string;
  layoutId?: number;
  holdSetImages?: string[];
}

export default function CreateClimbForm({
  boardType,
  angle,
  boardDetails,
  forkFrames,
  forkName,
  layoutFolder,
  layoutId,
  holdSetImages,
}: CreateClimbFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Aurora-specific hooks
  const { isAuthenticated, saveClimb } = useBoardProvider();

  // Determine which auth check to use based on board type
  const isLoggedIn = boardType === 'aurora' ? isAuthenticated : !!session?.user?.id;

  // Convert fork frames to initial holds map if provided (Aurora only)
  const initialHoldsMap = useMemo(() => {
    if (boardType !== 'aurora' || !forkFrames || !boardDetails) return undefined;
    const framesMap = convertLitUpHoldsStringToMap(forkFrames, boardDetails.board_name);
    return framesMap[0] ?? undefined;
  }, [boardType, forkFrames, boardDetails]);

  // Aurora hold management
  const auroraClimb = useCreateClimb(boardDetails?.board_name || 'kilter', { initialHoldsMap });

  // MoonBoard hold management
  const moonboardClimb = useMoonBoardCreateClimb();

  // Use the appropriate hook values based on board type
  const {
    litUpHoldsMap,
    handleHoldClick: baseHandleHoldClick,
    startingCount,
    finishCount,
    totalHolds,
    isValid,
    resetHolds: baseResetHolds,
  } = boardType === 'aurora' ? auroraClimb : moonboardClimb;

  const handCount = boardType === 'moonboard' ? moonboardClimb.handCount : 0;
  const generateFramesString = boardType === 'aurora' ? auroraClimb.generateFramesString : undefined;
  const setLitUpHoldsMap = boardType === 'moonboard' ? moonboardClimb.setLitUpHoldsMap : undefined;

  // Bluetooth for Aurora boards
  const { isConnected, sendFramesToBoard } = useBoardBluetooth({
    boardDetails: boardType === 'aurora' ? boardDetails : undefined
  });

  const createClimbContext = useCreateClimbContext();

  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CreateClimbFormValues | null>(null);

  // Aurora-specific state
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [isDraft, setIsDraft] = useState(false);

  // MoonBoard-specific state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [userGrade, setUserGrade] = useState<string | undefined>(undefined);
  const [isBenchmark, setIsBenchmark] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<number>(angle);

  // Common state
  const [climbName, setClimbName] = useState(forkName ? `${forkName} fork` : '');
  const [description, setDescription] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Construct the bulk import URL (MoonBoard only)
  const bulkImportUrl = pathname.replace(/\/create$/, '/import');

  // Send frames to board whenever litUpHoldsMap changes (Aurora only)
  useEffect(() => {
    if (boardType === 'aurora' && isConnected && generateFramesString) {
      const frames = generateFramesString();
      sendFramesToBoard(frames);
    }
  }, [boardType, litUpHoldsMap, isConnected, generateFramesString, sendFramesToBoard]);

  // Wrap handleHoldClick
  const handleHoldClick = useCallback(
    (holdId: number) => {
      baseHandleHoldClick(holdId);
    },
    [baseHandleHoldClick],
  );

  // Wrap resetHolds to also clear the board
  const resetHolds = useCallback(() => {
    baseResetHolds();
    if (boardType === 'aurora' && isConnected) {
      sendFramesToBoard('');
    }
  }, [boardType, baseResetHolds, isConnected, sendFramesToBoard]);

  // MoonBoard OCR import
  const handleOcrImport = useCallback(async (file: File) => {
    if (boardType !== 'moonboard' || !setLitUpHoldsMap) return;

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

      // Populate fields from OCR
      if (climb.name) setClimbName(climb.name);
      if (climb.userGrade) setUserGrade(climb.userGrade);
      if (climb.isBenchmark) setIsBenchmark(true);
      if (climb.setter) setDescription(`Setter: ${climb.setter}`);
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : 'Unknown error during OCR');
    } finally {
      setIsOcrProcessing(false);
    }
  }, [boardType, angle, setLitUpHoldsMap]);

  // Save climb - Aurora
  const doSaveAuroraClimb = useCallback(async () => {
    if (!boardDetails || !generateFramesString) return;

    setIsSaving(true);

    try {
      const frames = generateFramesString();

      await saveClimb({
        layout_id: boardDetails.layout_id,
        name: climbName,
        description: description || '',
        is_draft: isDraft,
        frames,
        frames_count: 1,
        frames_pace: 0,
        angle,
      });

      track('Climb Created', {
        boardLayout: boardDetails.layout_name || '',
        isDraft: isDraft,
        holdCount: totalHolds,
      });

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
  }, [boardDetails, generateFramesString, saveClimb, climbName, description, isDraft, angle, totalHolds, router]);

  // Save climb - MoonBoard
  const doSaveMoonBoardClimb = useCallback(async () => {
    if (!layoutId || !session?.user?.id) return;

    setIsSaving(true);

    try {
      // Convert holds to coordinate format for storage
      const holds = {
        start: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.state === 'STARTING')
          .map(([id]) => holdIdToCoordinate(Number(id))),
        hand: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.state === 'HAND')
          .map(([id]) => holdIdToCoordinate(Number(id))),
        finish: Object.entries(litUpHoldsMap)
          .filter(([, hold]) => hold.state === 'FINISH')
          .map(([id]) => holdIdToCoordinate(Number(id))),
      };

      const response = await fetch('/api/v1/moonboard/proxy/saveClimb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            layout_id: layoutId,
            user_id: session.user.id,
            name: climbName,
            description: description || '',
            holds,
            angle: selectedAngle,
            is_draft: isDraft,
            user_grade: userGrade,
            is_benchmark: isBenchmark,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save climb');
      }

      message.success('Climb saved to database!');

      const listUrl = pathname.replace(/\/create$/, '/list');
      router.push(listUrl);
    } catch (error) {
      console.error('Failed to save climb:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save climb. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [layoutId, session?.user?.id, litUpHoldsMap, climbName, description, userGrade, isBenchmark, isDraft, selectedAngle, pathname, router]);

  const handlePublish = useCallback(async () => {
    if (!isValid || !climbName.trim()) {
      return;
    }

    if (!isLoggedIn) {
      if (boardType === 'aurora') {
        setPendingFormValues({ name: climbName, description, isDraft });
        setShowAuthModal(true);
      }
      return;
    }

    if (boardType === 'aurora') {
      await doSaveAuroraClimb();
    } else {
      await doSaveMoonBoardClimb();
    }
  }, [boardType, isValid, climbName, isLoggedIn, description, isDraft, doSaveAuroraClimb, doSaveMoonBoardClimb]);

  const handleAuthSuccess = async () => {
    if (pendingFormValues) {
      setTimeout(async () => {
        setPendingFormValues(null);
      }, 1000);
    }
  };

  const handleCancel = useCallback(() => {
    if (boardType === 'aurora' && boardDetails) {
      const listUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name || '',
        boardDetails.size_name || '',
        boardDetails.size_description,
        boardDetails.set_names || [],
        angle,
      );
      router.push(listUrl);
    } else {
      router.back();
    }
  }, [boardType, boardDetails, angle, router]);

  const canSave = isLoggedIn && isValid && climbName.trim().length > 0;

  const handleToggleSettings = useCallback(() => {
    setShowSettingsPanel((prev) => !prev);
  }, []);

  const handleToggleHeatmap = useCallback(() => {
    if (boardType !== 'aurora' || !boardDetails) return;
    setShowHeatmap((prev) => {
      track(`Create Climb Heatmap ${!prev ? 'Shown' : 'Hidden'}`, {
        boardLayout: boardDetails.layout_name || '',
      });
      return !prev;
    });
  }, [boardType, boardDetails]);

  // Register actions with context for header to use
  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.registerActions({
        onPublish: handlePublish,
        onCancel: handleCancel,
      });
    }
  }, [createClimbContext, handlePublish, handleCancel]);

  // Update context state
  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.setCanPublish(canSave);
    }
  }, [createClimbContext, canSave]);

  useEffect(() => {
    if (createClimbContext) {
      createClimbContext.setIsPublishing(isSaving);
    }
  }, [createClimbContext, isSaving]);

  // Render save/login button
  const renderSaveButton = () => {
    if (boardType === 'aurora') {
      if (!isAuthenticated) {
        return (
          <Button type="primary" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)}>
            Sign In
          </Button>
        );
      }
      return (
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={isSaving}
          disabled={!canSave}
          onClick={handlePublish}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      );
    }

    // MoonBoard
    if (!session?.user) {
      return (
        <Link href="/api/auth/signin">
          <Button type="primary" icon={<LoginOutlined />}>
            Log in to Save
          </Button>
        </Link>
      );
    }
    return (
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={isSaving}
        disabled={!canSave}
        onClick={handlePublish}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    );
  };

  return (
    <div className={styles.pageContainer}>
      {/* Unified Header */}
      <div className={styles.createHeader}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          Back
        </Button>
        <Input
          placeholder="Climb name"
          maxLength={100}
          className={styles.headerNameInput}
          variant="borderless"
          value={climbName}
          onChange={(e) => setClimbName(e.target.value)}
        />
        {/* MoonBoard: Show grade in header like climb card */}
        {boardType === 'moonboard' && userGrade && (
          <Text
            style={{
              fontSize: 28,
              fontWeight: themeTokens.typography.fontWeight.bold,
              lineHeight: 1,
              color: getFontGradeColor(userGrade) ?? 'var(--ant-color-text-secondary)',
              flexShrink: 0,
            }}
          >
            {userGrade}
          </Text>
        )}
        <Button
          type="text"
          icon={showSettingsPanel ? <CloseOutlined /> : <SettingOutlined />}
          onClick={handleToggleSettings}
        />
        {renderSaveButton()}
      </div>

      {/* Auth alert for both board types */}
      {!isLoggedIn && (
        <Alert
          title="Sign in required"
          description="Sign in to your Boardsesh account to save your climb."
          type="warning"
          showIcon
          className={styles.authAlert}
          action={
            boardType === 'aurora' ? (
              <Button size="small" type="primary" onClick={() => setShowAuthModal(true)}>
                Sign In
              </Button>
            ) : (
              <Link href="/api/auth/signin">
                <Button size="small" type="primary">
                  Sign In
                </Button>
              </Link>
            )
          }
        />
      )}

      {/* MoonBoard OCR errors */}
      {boardType === 'moonboard' && ocrError && (
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

      {boardType === 'moonboard' && ocrWarnings.length > 0 && (
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
        {/* Controls bar with draft toggle (all boards) and heatmap (Aurora only) */}
        <div className={styles.climbTitleContainer}>
          <Flex gap={8} align="center">
            <Text type="secondary" className={styles.draftLabel}>
              Draft
            </Text>
            <Switch
              size="small"
              checked={isDraft}
              onChange={setIsDraft}
            />
            {/* Aurora-only: Heatmap toggle */}
            {boardType === 'aurora' && (
              <>
                <Tooltip title={showHeatmap ? 'Hide heatmap' : 'Show hold popularity heatmap'}>
                  <Button
                    type={showHeatmap ? 'primary' : 'text'}
                    icon={<FireOutlined />}
                    size="small"
                    onClick={handleToggleHeatmap}
                    danger={showHeatmap}
                    className={styles.heatmapButton}
                  />
                </Tooltip>
                {showHeatmap && (
                  <>
                    <Text type="secondary" className={styles.draftLabel}>
                      Opacity
                    </Text>
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={heatmapOpacity}
                      onChange={setHeatmapOpacity}
                      className={styles.opacitySlider}
                    />
                  </>
                )}
              </>
            )}
          </Flex>
        </div>

        {/* Board Section */}
        <div className={styles.boardContainer}>
          <div className={styles.boardWrapper}>
            {boardType === 'aurora' && boardDetails ? (
              <>
                <BoardRenderer
                  boardDetails={boardDetails}
                  litUpHoldsMap={litUpHoldsMap}
                  mirrored={false}
                  onHoldClick={handleHoldClick}
                  fillHeight
                />
                <CreateClimbHeatmapOverlay
                  boardDetails={boardDetails}
                  angle={angle}
                  litUpHoldsMap={litUpHoldsMap}
                  opacity={heatmapOpacity}
                  enabled={showHeatmap}
                />
              </>
            ) : boardType === 'moonboard' && layoutFolder && holdSetImages ? (
              <MoonBoardRenderer
                layoutFolder={layoutFolder}
                holdSetImages={holdSetImages}
                litUpHoldsMap={litUpHoldsMap}
                onHoldClick={handleHoldClick}
              />
            ) : null}
          </div>

          {/* Settings overlay panel */}
          {showSettingsPanel && (
            <div
              className={styles.settingsPanel}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.settingsPanelHeader}>
                <Text strong>Climb Settings</Text>
              </div>
              <div className={styles.settingsPanelContent}>
                {/* MoonBoard-specific: Angle, Grade and Benchmark */}
                {boardType === 'moonboard' && (
                  <>
                    <div className={styles.settingsField}>
                      <Text type="secondary" className={styles.settingsLabel}>
                        Angle
                      </Text>
                      <Select
                        value={selectedAngle}
                        onChange={setSelectedAngle}
                        options={MOONBOARD_ANGLES.map(a => ({ value: a, label: `${a}°` }))}
                        className={styles.settingsGradeField}
                      />
                    </div>
                    <div className={styles.settingsField}>
                      <Text type="secondary" className={styles.settingsLabel}>
                        Grade
                      </Text>
                      <Select
                        placeholder="Select grade"
                        value={userGrade}
                        onChange={setUserGrade}
                        options={MOONBOARD_GRADES.map(g => ({ value: g.value, label: g.label }))}
                        className={styles.settingsGradeField}
                        allowClear
                      />
                    </div>
                    <div className={styles.settingsField}>
                      <Flex gap={8} align="center">
                        <Switch
                          size="small"
                          checked={isBenchmark}
                          onChange={setIsBenchmark}
                        />
                        <Text>Benchmark</Text>
                      </Flex>
                    </div>
                  </>
                )}
                {/* Common: Description */}
                <div className={styles.settingsField}>
                  <Text type="secondary" className={styles.settingsLabel}>
                    Description (optional)
                  </Text>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add beta or notes about your climb..."
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hold counts bar at bottom */}
        <div className={styles.holdCountsBar}>
          <Space wrap size="small">
            {boardType === 'aurora' ? (
              <>
                <Tag color={startingCount > 0 ? 'green' : 'default'}>Starting: {startingCount}/2</Tag>
                <Tag color={finishCount > 0 ? 'magenta' : 'default'}>Finish: {finishCount}/2</Tag>
                <Tag color={totalHolds > 0 ? 'blue' : 'default'}>Total: {totalHolds}</Tag>
              </>
            ) : (
              <>
                <Tag color={startingCount > 0 ? 'red' : 'default'}>Start: {startingCount}/2</Tag>
                <Tag color={handCount > 0 ? 'blue' : 'default'}>Hand: {handCount}</Tag>
                <Tag color={finishCount > 0 ? 'green' : 'default'}>Finish: {finishCount}/2</Tag>
                <Tag color={totalHolds > 0 ? 'purple' : 'default'}>Total: {totalHolds}</Tag>
              </>
            )}
          </Space>
          <Space wrap size="small">
            {totalHolds > 0 && (
              <Button size="small" onClick={resetHolds}>
                Clear
              </Button>
            )}
            {/* MoonBoard-only: Import buttons */}
            {boardType === 'moonboard' && (
              <>
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
              </>
            )}
          </Space>
        </div>
      </div>

      {/* MoonBoard validation hint */}
      {boardType === 'moonboard' && !isValid && totalHolds > 0 && (
        <div className={styles.validationBar}>
          <Text type="secondary">
            A valid climb needs at least 1 start hold and 1 finish hold
          </Text>
        </div>
      )}

      {/* Auth modal (Aurora only) */}
      {boardType === 'aurora' && (
        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          title="Sign in to save your climb"
          description="Create an account or sign in to save your climb to the board."
        />
      )}
    </div>
  );
}
