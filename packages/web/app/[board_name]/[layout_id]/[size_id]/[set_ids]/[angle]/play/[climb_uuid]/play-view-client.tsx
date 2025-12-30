'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Empty } from 'antd';
import { FastForwardOutlined, FastBackwardOutlined } from '@ant-design/icons';
import { useSwipeable } from 'react-swipeable';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails, Angle } from '@/app/lib/types';
import { useQueueContext } from '@/app/components/graphql-queue';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import ClimbTitle from '@/app/components/climb-card/climb-title';
import { constructClimbListWithSlugs, constructPlayUrlWithSlugs } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './play-view.module.css';

type PlayViewClientProps = {
  boardDetails: BoardDetails;
  initialClimb: Climb | null;
  angle: Angle;
};

// Swipe threshold in pixels to trigger navigation
const SWIPE_THRESHOLD = 100;
// Maximum swipe distance (matches queue-control-bar)
const MAX_SWIPE = 120;

const PlayViewClient: React.FC<PlayViewClientProps> = ({ boardDetails, initialClimb, angle }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentClimb,
    setCurrentClimbQueueItem,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
    queue,
  } = useQueueContext();

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Use queue's current climb if available, otherwise use initial climb from SSR
  const displayClimb = currentClimb || initialClimb;

  // Check if user has already swiped before (persisted in localStorage)
  // Only runs on client to avoid SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
    try {
      const hasSwipedBefore = localStorage.getItem('playViewSwipeHintDismissed');
      if (hasSwipedBefore) {
        return;
      }

      // Show hint for new users, then auto-hide after 3 seconds
      setShowSwipeHint(true);
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 3000);
      return () => clearTimeout(timer);
    } catch {
      // localStorage unavailable (private browsing, quota exceeded, etc.)
    }
  }, []);

  const dismissSwipeHintPermanently = useCallback(() => {
    if (showSwipeHint) {
      setShowSwipeHint(false);
      try {
        localStorage.setItem('playViewSwipeHintDismissed', 'true');
      } catch {
        // localStorage unavailable (private browsing, quota exceeded, etc.)
      }
    }
  }, [showSwipeHint]);

  const getBackToListUrl = useCallback(() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    let baseUrl: string;
    if (layout_name && size_name && set_names) {
      baseUrl = constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    } else {
      baseUrl = `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
    }

    // Preserve the search/filter params from when the user entered play mode
    const queryString = searchParams.toString();
    if (queryString) {
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  }, [boardDetails, angle, searchParams]);

  const navigateToClimb = useCallback(
    (climb: Climb) => {
      const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

      let url: string;
      if (layout_name && size_name && set_names) {
        url = constructPlayUrlWithSlugs(
          board_name,
          layout_name,
          size_name,
          size_description,
          set_names,
          angle,
          climb.uuid,
          climb.name,
        );
      } else {
        // Fallback to numeric format when slug data is unavailable
        url = `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/play/${climb.uuid}`;
      }

      // Preserve the search params when navigating between climbs
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      router.push(url);
    },
    [boardDetails, angle, router, searchParams],
  );

  const handleNext = useCallback(() => {
    const nextItem = getNextClimbQueueItem();
    if (nextItem) {
      setCurrentClimbQueueItem(nextItem);
      navigateToClimb(nextItem.climb);
      track('Play Mode Navigation', {
        direction: 'next',
        boardLayout: boardDetails.layout_name || '',
      });
    }
  }, [getNextClimbQueueItem, setCurrentClimbQueueItem, navigateToClimb, boardDetails.layout_name]);

  const handlePrevious = useCallback(() => {
    const prevItem = getPreviousClimbQueueItem();
    if (prevItem) {
      setCurrentClimbQueueItem(prevItem);
      navigateToClimb(prevItem.climb);
      track('Play Mode Navigation', {
        direction: 'previous',
        boardLayout: boardDetails.layout_name || '',
      });
    }
  }, [getPreviousClimbQueueItem, setCurrentClimbQueueItem, navigateToClimb, boardDetails.layout_name]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX } = eventData;
      // Clamp the offset within bounds (matches queue-control-bar)
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setSwipeOffset(clampedOffset);
      dismissSwipeHintPermanently();
    },
    onSwipedLeft: (eventData) => {
      setSwipeOffset(0);
      if (Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleNext();
      }
    },
    onSwipedRight: (eventData) => {
      setSwipeOffset(0);
      if (Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handlePrevious();
      }
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const nextItem = getNextClimbQueueItem();
  const prevItem = getPreviousClimbQueueItem();

  if (!displayClimb) {
    return (
      <div className={styles.pageContainer} style={{ backgroundColor: themeTokens.semantic.background }}>
        <div className={styles.emptyState} style={{ color: themeTokens.neutral[400] }}>
          <Empty description="No climb selected" />
          <Button type="primary" onClick={() => router.push(getBackToListUrl())}>
            Browse Climbs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer} style={{ backgroundColor: themeTokens.semantic.background }}>
      {/* Main Content with Swipe */}
      <div className={styles.contentWrapper}>
        {/* Climb title - horizontal layout with grade on right */}
        <div className={styles.climbTitleContainer}>
          <ClimbTitle climb={displayClimb} layout="horizontal" showSetterInfo />
        </div>
        <div className={styles.swipeWrapper}>
          {/* Left action background (previous - revealed on swipe right) */}
          {prevItem && isClient && (
            <div
              className={`${styles.swipeAction} ${styles.swipeActionLeft}`}
              style={{
                backgroundColor: themeTokens.colors.primary,
                opacity: Math.min(1, swipeOffset / SWIPE_THRESHOLD),
                visibility: swipeOffset > 0 ? 'visible' : 'hidden',
              }}
            >
              <FastBackwardOutlined className={styles.swipeActionIcon} />
            </div>
          )}

          {/* Right action background (next - revealed on swipe left) */}
          {nextItem && isClient && (
            <div
              className={`${styles.swipeAction} ${styles.swipeActionRight}`}
              style={{
                backgroundColor: themeTokens.colors.primary,
                opacity: Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD),
                visibility: swipeOffset < 0 ? 'visible' : 'hidden',
              }}
            >
              <FastForwardOutlined className={styles.swipeActionIcon} />
            </div>
          )}

          {/* Swipeable content */}
          <div
            {...swipeHandlers}
            className={styles.swipeContainer}
            style={{
              transform: isClient ? `translateX(${swipeOffset}px)` : undefined,
              transition: swipeOffset === 0 ? `transform ${themeTokens.transitions.fast}` : 'none',
            }}
          >
            <div className={styles.boardContainer}>
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHoldsMap={displayClimb.litUpHoldsMap}
                mirrored={!!displayClimb.mirrored}
                fillHeight
              />
            </div>

            {/* Swipe hint for mobile */}
            {showSwipeHint && queue.length > 1 && (
              <div className={styles.swipeHint}>Swipe left/right to navigate</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayViewClient;
