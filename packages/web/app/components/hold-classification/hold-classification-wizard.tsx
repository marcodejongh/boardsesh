'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Drawer, Button, Progress, Rate, Typography, Spin, message } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { BoardDetails } from '@/app/lib/types';
import { HoldRenderData } from '../board-renderer/types';
import { getImageUrl } from '../board-renderer/util';
import { themeTokens } from '@/app/theme/theme-config';
import {
  HoldClassificationWizardProps,
  HoldType,
  HoldClassification,
  HOLD_TYPE_OPTIONS,
  StoredHoldClassification,
} from './types';
import DirectionPicker from './direction-picker';
import styles from './hold-classification-wizard.module.css';

const { Text, Title } = Typography;

// Zoom factor for the hold view (how much to zoom in on the hold)
const ZOOM_FACTOR = 8;
// Minimum viewport size around the hold
const MIN_VIEWPORT_SIZE = 100;

interface HoldViewProps {
  hold: HoldRenderData;
  boardDetails: BoardDetails;
}

/**
 * Component that renders a zoomed-in view of a single hold on the board
 */
const HoldView: React.FC<HoldViewProps> = ({ hold, boardDetails }) => {
  const { boardWidth, boardHeight } = boardDetails;

  // Calculate the viewport to zoom in on the hold
  // We want to show the hold centered with some context around it
  const viewSize = Math.max(hold.r * ZOOM_FACTOR, MIN_VIEWPORT_SIZE);
  const viewX = Math.max(0, Math.min(hold.cx - viewSize / 2, boardWidth - viewSize));
  const viewY = Math.max(0, Math.min(hold.cy - viewSize / 2, boardHeight - viewSize));

  return (
    <svg
      viewBox={`${viewX} ${viewY} ${viewSize} ${viewSize}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', maxHeight: '300px' }}
    >
      {/* Board background images */}
      {Object.keys(boardDetails.images_to_holds).map((imageUrl) => (
        <image
          key={imageUrl}
          href={getImageUrl(imageUrl, boardDetails.board_name)}
          width={boardWidth}
          height={boardHeight}
        />
      ))}

      {/* Highlight the current hold */}
      <circle
        cx={hold.cx}
        cy={hold.cy}
        r={hold.r}
        stroke={themeTokens.colors.primary}
        strokeWidth={hold.r / 4}
        fill="none"
      />
      <circle
        cx={hold.cx}
        cy={hold.cy}
        r={hold.r * 1.5}
        stroke={themeTokens.colors.primary}
        strokeWidth={2}
        fill="none"
        strokeDasharray="4 4"
        opacity={0.5}
      />
    </svg>
  );
};

const HoldClassificationWizard: React.FC<HoldClassificationWizardProps> = ({
  open,
  onClose,
  boardDetails,
  onComplete,
}) => {
  const { status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<Map<number, HoldClassification>>(new Map());
  const [isComplete, setIsComplete] = useState(false);

  // Get holds from board details, sorted by position (top-left to bottom-right)
  const holds = useMemo(() => {
    if (!boardDetails?.holdsData) return [];
    return [...boardDetails.holdsData].sort((a, b) => {
      // Sort by row (y position) first, then by column (x position)
      const rowA = Math.floor(a.cy / 50);
      const rowB = Math.floor(b.cy / 50);
      if (rowA !== rowB) return rowA - rowB;
      return a.cx - b.cx;
    });
  }, [boardDetails?.holdsData]);

  const currentHold = holds[currentIndex];

  // Load existing classifications
  const loadClassifications = useCallback(async () => {
    if (!boardDetails) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/internal/hold-classifications?` +
        `boardType=${boardDetails.board_name}&` +
        `layoutId=${boardDetails.layout_id}&` +
        `sizeId=${boardDetails.size_id}`
      );

      if (response.ok) {
        const data = await response.json();
        const classMap = new Map<number, HoldClassification>();

        data.classifications.forEach((c: StoredHoldClassification) => {
          classMap.set(c.holdId, {
            holdId: c.holdId,
            holdType: c.holdType,
            handRating: c.handRating,
            footRating: c.footRating,
            pullDirection: c.pullDirection,
          });
        });

        setClassifications(classMap);
      }
    } catch (error) {
      console.error('Failed to load classifications:', error);
    } finally {
      setLoading(false);
    }
  }, [boardDetails]);

  // Load existing classifications when the wizard opens
  useEffect(() => {
    if (open && sessionStatus === 'authenticated' && boardDetails) {
      loadClassifications();
    }
    if (open) {
      setCurrentIndex(0);
      setIsComplete(false);
    }
  }, [open, sessionStatus, boardDetails, loadClassifications]);

  const saveClassification = useCallback(async (holdId: number, classification: HoldClassification) => {
    setSaving(true);
    try {
      const response = await fetch('/api/internal/hold-classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardType: boardDetails.board_name,
          layoutId: boardDetails.layout_id,
          sizeId: boardDetails.size_id,
          holdId,
          holdType: classification.holdType,
          handRating: classification.handRating,
          footRating: classification.footRating,
          pullDirection: classification.pullDirection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save classification');
      }
    } catch (error) {
      console.error('Failed to save classification:', error);
      message.error('Failed to save classification');
    } finally {
      setSaving(false);
    }
  }, [boardDetails]);

  const getCurrentClassification = useCallback((): HoldClassification => {
    if (!currentHold) {
      return { holdId: 0, holdType: null, handRating: null, footRating: null, pullDirection: null };
    }
    return classifications.get(currentHold.id) || {
      holdId: currentHold.id,
      holdType: null,
      handRating: null,
      footRating: null,
      pullDirection: null,
    };
  }, [currentHold, classifications]);

  const handleHoldTypeSelect = useCallback(async (holdType: HoldType) => {
    if (!currentHold) return;

    const current = getCurrentClassification();
    const updated: HoldClassification = {
      ...current,
      holdId: currentHold.id,
      holdType,
    };

    setClassifications(new Map(classifications).set(currentHold.id, updated));
    await saveClassification(currentHold.id, updated);
  }, [currentHold, classifications, getCurrentClassification, saveClassification]);

  const handleHandRatingChange = useCallback(async (rating: number) => {
    if (!currentHold) return;

    const current = getCurrentClassification();
    const updated: HoldClassification = {
      ...current,
      holdId: currentHold.id,
      handRating: rating,
    };

    setClassifications(new Map(classifications).set(currentHold.id, updated));
    await saveClassification(currentHold.id, updated);
  }, [currentHold, classifications, getCurrentClassification, saveClassification]);

  const handleFootRatingChange = useCallback(async (rating: number) => {
    if (!currentHold) return;

    const current = getCurrentClassification();
    const updated: HoldClassification = {
      ...current,
      holdId: currentHold.id,
      footRating: rating,
    };

    setClassifications(new Map(classifications).set(currentHold.id, updated));
    await saveClassification(currentHold.id, updated);
  }, [currentHold, classifications, getCurrentClassification, saveClassification]);

  const handlePullDirectionChange = useCallback(async (direction: number) => {
    if (!currentHold) return;

    const current = getCurrentClassification();
    const updated: HoldClassification = {
      ...current,
      holdId: currentHold.id,
      pullDirection: direction,
    };

    setClassifications(new Map(classifications).set(currentHold.id, updated));
    await saveClassification(currentHold.id, updated);
  }, [currentHold, classifications, getCurrentClassification, saveClassification]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsComplete(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < holds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, holds.length, onComplete]);

  const progress = holds.length > 0 ? ((currentIndex + 1) / holds.length) * 100 : 0;
  const classifiedCount = Array.from(classifications.values()).filter(
    c => c.holdType !== null || c.handRating !== null || c.footRating !== null || c.pullDirection !== null
  ).length;

  // Filter hold types based on board type (e.g., exclude pocket for Kilter)
  const filteredHoldTypeOptions = useMemo(() => {
    const boardName = boardDetails.board_name as string;
    return HOLD_TYPE_OPTIONS.filter(option => {
      return !(option.excludeBoards as readonly string[]).includes(boardName);
    });
  }, [boardDetails.board_name]);

  // Render loading state
  if (loading) {
    return (
      <Drawer
        title="Hold Classification"
        open={open}
        onClose={onClose}
        placement="bottom"
        height="100vh"
      >
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <Text className={styles.loadingText}>Loading holds...</Text>
        </div>
      </Drawer>
    );
  }

  // Render empty state
  if (holds.length === 0) {
    return (
      <Drawer
        title="Hold Classification"
        open={open}
        onClose={onClose}
        placement="bottom"
        height="100vh"
      >
        <div className={styles.emptyState}>
          <Text>No holds found for this board configuration.</Text>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Drawer>
    );
  }

  // Render completion state
  if (isComplete) {
    return (
      <Drawer
        title="Hold Classification"
        open={open}
        onClose={onClose}
        placement="bottom"
        height="100vh"
      >
        <div className={styles.completeContainer}>
          <CheckCircleFilled className={styles.completeIcon} />
          <Title level={3} className={styles.completeTitle}>
            Classification Complete!
          </Title>
          <Text className={styles.completeSubtitle}>
            You've classified {classifiedCount} of {holds.length} holds.
            You can run through this wizard again anytime to update your ratings.
          </Text>
          <Button type="primary" size="large" onClick={onClose}>
            Done
          </Button>
        </div>
      </Drawer>
    );
  }

  const currentClassification = getCurrentClassification();

  return (
    <Drawer
      title={
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Classify Hold</span>
        </div>
      }
      open={open}
      onClose={onClose}
      placement="bottom"
      height="100vh"
      styles={{
        header: {
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        },
        body: {
          padding: 16,
          overflow: 'auto',
        },
      }}
    >
      <div className={styles.container}>
        {/* Progress indicator */}
        <div className={styles.progressSection}>
          <Text className={styles.progressText}>
            Hold {currentIndex + 1} of {holds.length} ({classifiedCount} classified)
          </Text>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={themeTokens.colors.primary}
          />
        </div>

        {/* Hold view (zoomed in on the board) */}
        <div className={styles.holdViewSection}>
          <div className={styles.holdViewContainer}>
            {currentHold && (
              <HoldView hold={currentHold} boardDetails={boardDetails} />
            )}
          </div>
        </div>

        {/* Classification controls */}
        <div className={styles.classificationSection}>
          {/* Hold type selection */}
          <div>
            <Text className={styles.sectionTitle}>Hold Type</Text>
            <div className={styles.holdTypeList}>
              {filteredHoldTypeOptions.map((option) => (
                <div
                  key={option.value}
                  className={`${styles.holdTypeItem} ${
                    currentClassification.holdType === option.value
                      ? styles.holdTypeItemSelected
                      : ''
                  }`}
                  onClick={() => handleHoldTypeSelect(option.value)}
                >
                  <span className={styles.holdTypeLabel}>{option.label}</span>
                  {currentClassification.holdType === option.value && (
                    <CheckOutlined className={styles.holdTypeCheck} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hand rating */}
          <div className={styles.ratingSection}>
            <Text className={styles.sectionTitle}>Hand Rating (1-5)</Text>
            <div className={styles.ratingLabel}>
              1 = Easy to grip, 5 = Very difficult
            </div>
            <Rate
              value={currentClassification.handRating || 0}
              onChange={handleHandRatingChange}
              disabled={saving}
            />
          </div>

          {/* Foot rating */}
          <div className={styles.ratingSection}>
            <Text className={styles.sectionTitle}>Foot Rating (1-5)</Text>
            <div className={styles.ratingLabel}>
              1 = Easy to stand on, 5 = Very difficult
            </div>
            <Rate
              value={currentClassification.footRating || 0}
              onChange={handleFootRatingChange}
              disabled={saving}
            />
          </div>

          {/* Direction of pull */}
          <div className={styles.directionSection}>
            <Text className={styles.sectionTitle}>Direction of Pull</Text>
            <div className={styles.ratingLabel}>
              Click or drag to set the best pulling direction
            </div>
            <DirectionPicker
              value={currentClassification.pullDirection}
              onChange={handlePullDirectionChange}
              disabled={saving}
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className={styles.navigationSection}>
          <Button
            className={styles.navButton}
            icon={<ArrowLeftOutlined />}
            onClick={handlePrevious}
            disabled={currentIndex === 0 || saving}
          >
            Previous
          </Button>
          <Button
            className={styles.skipButton}
            onClick={handleNext}
            disabled={saving}
          >
            Skip
          </Button>
          <Button
            className={styles.navButton}
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={handleNext}
            loading={saving}
          >
            {currentIndex === holds.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default HoldClassificationWizard;
