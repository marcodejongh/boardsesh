'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer, Button } from 'antd';
import {
  SyncOutlined,
  HeartOutlined,
  HeartFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  DownOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useSwipeable } from 'react-swipeable';
import dynamic from 'next/dynamic';
import { useQueueContext } from '../graphql-queue';
import { useFavorite, ClimbActions } from '../climb-actions';
import { ShareBoardButton } from '../board-page/share-button';
import { TickButton } from '../logbook/tick-button';
import ClimbTitle from '../climb-card/climb-title';
import BoardRenderer from '../board-renderer/board-renderer';
import { useCardSwipeNavigation, EXIT_DURATION, SNAP_BACK_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import { useWakeLock } from '../board-bluetooth-control/use-wake-lock';
import { themeTokens } from '@/app/theme/theme-config';
import type { ActiveDrawer } from '../queue-control/queue-control-bar';
import type { BoardDetails, Angle } from '@/app/lib/types';
import styles from './play-view-drawer.module.css';

const SendClimbToBoardButton = dynamic(
  () => import('../board-bluetooth-control/send-climb-to-board-button').then((mod) => mod.default || mod),
  { ssr: false },
);

// Threshold for downward swipe to dismiss the drawer
const DISMISS_THRESHOLD = 120;
const DISMISS_ANIMATION_MS = 300;

interface PlayViewDrawerProps {
  activeDrawer: ActiveDrawer;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  boardDetails: BoardDetails;
  angle: Angle;
}

const PlayViewDrawer: React.FC<PlayViewDrawerProps> = ({
  activeDrawer,
  setActiveDrawer,
  boardDetails,
  angle,
}) => {
  const isOpen = activeDrawer === 'play';
  const [dragOffset, setDragOffset] = useState(0);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const isDraggingRef = useRef(false);
  const isDismissingRef = useRef(false);

  const {
    currentClimb,
    currentClimbQueueItem,
    mirrorClimb,
    queue,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
    setCurrentClimbQueueItem,
    viewOnlyMode,
  } = useQueueContext();

  const { isFavorited, toggleFavorite } = useFavorite({
    climbUuid: currentClimb?.uuid ?? '',
  });

  // Wake lock when drawer is open
  useWakeLock(isOpen);

  // Hash-based back button support
  useEffect(() => {
    if (!isOpen) return;

    // Push a hash state so back button closes the drawer
    window.history.pushState(null, '', '#playing');

    const handlePopState = () => {
      setActiveDrawer('none');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up hash if still present
      if (window.location.hash === '#playing') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
  }, [isOpen, setActiveDrawer]);

  const handleClose = useCallback(() => {
    setActiveDrawer('none');
    // Remove hash if present
    if (window.location.hash === '#playing') {
      window.history.back();
    }
  }, [setActiveDrawer]);

  // Swipe-down-to-close (covers entire drawer content)
  const dragHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaY, dir } = eventData;
      if (dir === 'Down' && deltaY > 0) {
        isDraggingRef.current = true;
        setDragOffset(deltaY);
      }
    },
    onSwipedDown: (eventData) => {
      isDraggingRef.current = false;
      if (eventData.deltaY >= DISMISS_THRESHOLD) {
        // Animate the drawer fully off-screen, then close
        isDismissingRef.current = true;
        setDragOffset(window.innerHeight);
        setTimeout(() => {
          handleClose();
        }, DISMISS_ANIMATION_MS);
      } else {
        setDragOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (!isDismissingRef.current) {
        setDragOffset(0);
      }
      isDraggingRef.current = false;
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  // Card-swipe navigation
  const nextItem = getNextClimbQueueItem();
  const prevItem = getPreviousClimbQueueItem();

  const handleSwipeNext = useCallback(() => {
    const next = getNextClimbQueueItem();
    if (!next || viewOnlyMode) return;
    setCurrentClimbQueueItem(next);
  }, [getNextClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode]);

  const handleSwipePrevious = useCallback(() => {
    const prev = getPreviousClimbQueueItem();
    if (!prev || viewOnlyMode) return;
    setCurrentClimbQueueItem(prev);
  }, [getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode]);

  const canSwipeNext = !viewOnlyMode && !!nextItem;
  const canSwipePrevious = !viewOnlyMode && !!prevItem;

  const { swipeHandlers, swipeOffset, isAnimating } = useCardSwipeNavigation({
    onSwipeNext: handleSwipeNext,
    onSwipePrevious: handleSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
  });

  const getSwipeTransition = () => {
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
  };

  const isMirrored = !!currentClimb?.mirrored;

  return (
    <Drawer
      placement="bottom"
      height="100%"
      open={isOpen}
      onClose={handleClose}
      closable={false}
      afterOpenChange={(open) => {
        if (!open) {
          setDragOffset(0);
          isDismissingRef.current = false;
        }
      }}
      styles={{
        body: { padding: 0, overflow: 'hidden', overscrollBehaviorY: 'contain', touchAction: 'none' },
        wrapper: { height: '100%', boxShadow: dragOffset > 0 ? 'none' : undefined },
        mask: dragOffset > 0
          ? {
              opacity: Math.max(0, 1 - dragOffset / window.innerHeight),
              transition: isDraggingRef.current ? 'none' : `opacity ${DISMISS_ANIMATION_MS}ms ease-out`,
            }
          : {},
      }}
      style={{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: isDraggingRef.current ? 'none' : `transform ${DISMISS_ANIMATION_MS}ms ease-out`,
      }}
    >
      <div {...dragHandlers} className={styles.drawerContent}>
        {/* Top bar: close button, drag handle, ellipsis menu */}
        <div className={styles.topBar}>
          <Button
            type="text"
            icon={<DownOutlined />}
            onClick={handleClose}
            aria-label="Close play view"
          />
          <div className={styles.dragHandleBar} />
          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={() => setIsActionsOpen(true)}
            aria-label="Climb actions"
          />
        </div>

        {/* Board renderer with card-swipe */}
        <div className={styles.boardSection}>
          <div
            {...swipeHandlers}
            className={styles.swipeCardContainer}
            style={{
              transform: `translateX(${swipeOffset}px)`,
              transition: getSwipeTransition(),
            }}
          >
            {isOpen && currentClimb && (
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHoldsMap={currentClimb.litUpHoldsMap}
                mirrored={isMirrored}
                fillHeight
              />
            )}
          </div>
        </div>

        {/* Climb info below board */}
        <div className={styles.climbInfoSection}>
          <ClimbTitle
            climb={currentClimb}
            layout="horizontal"
            showSetterInfo
            showAngle
          />
        </div>

        {/* Action bar with prev/next on the outside */}
        <div className={styles.actionBar}>
          <Button
            type="text"
            icon={<StepBackwardOutlined />}
            disabled={!canSwipePrevious}
            onClick={() => {
              const prev = getPreviousClimbQueueItem();
              if (prev) setCurrentClimbQueueItem(prev);
            }}
          />

          {/* Mirror */}
          {boardDetails.supportsMirroring && (
            <Button
              type={isMirrored ? 'primary' : 'text'}
              icon={<SyncOutlined />}
              onClick={() => mirrorClimb()}
              style={
                isMirrored
                  ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple }
                  : undefined
              }
            />
          )}

          {/* Favorite */}
          <Button
            type="text"
            icon={isFavorited ? <HeartFilled style={{ color: themeTokens.colors.error }} /> : <HeartOutlined />}
            onClick={() => toggleFavorite()}
          />

          {/* Party */}
          <ShareBoardButton />

          {/* LED */}
          <SendClimbToBoardButton boardDetails={boardDetails} />

          {/* Tick */}
          <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} />

          <Button
            type="text"
            icon={<StepForwardOutlined />}
            disabled={!canSwipeNext}
            onClick={() => {
              const next = getNextClimbQueueItem();
              if (next) setCurrentClimbQueueItem(next);
            }}
          />
        </div>
      </div>

      {/* Climb actions drawer (same as ellipsis menu in climb list) */}
      {currentClimb && (
        <Drawer
          title={currentClimb.name}
          placement="bottom"
          open={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
          styles={{
            wrapper: { height: 'auto' },
            body: { padding: `${themeTokens.spacing[2]}px 0` },
          }}
        >
          <ClimbActions
            climb={currentClimb}
            boardDetails={boardDetails}
            angle={typeof angle === 'string' ? parseInt(angle, 10) : angle}
            viewMode="list"
            onActionComplete={() => setIsActionsOpen(false)}
          />
        </Drawer>
      )}
    </Drawer>
  );
};

export default PlayViewDrawer;
