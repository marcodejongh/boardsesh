'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Badge, Space } from 'antd';
import {
  SyncOutlined,
  HeartOutlined,
  HeartFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  DownOutlined,
  MoreOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useQueueContext } from '../graphql-queue';
import { useFavorite, ClimbActions } from '../climb-actions';
import { ShareBoardButton } from '../board-page/share-button';
import { TickButton } from '../logbook/tick-button';
import QueueList, { QueueListHandle } from '../queue-control/queue-list';
import ClimbTitle from '../climb-card/climb-title';
import BoardRenderer from '../board-renderer/board-renderer';
import { useCardSwipeNavigation, EXIT_DURATION, SNAP_BACK_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import { useWakeLock } from '../board-bluetooth-control/use-wake-lock';
import { themeTokens } from '@/app/theme/theme-config';
import DrawerContext from '@rc-component/drawer/es/context';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import type { ActiveDrawer } from '../queue-control/queue-control-bar';
import type { BoardDetails, Angle } from '@/app/lib/types';
import styles from './play-view-drawer.module.css';

const SendClimbToBoardButton = dynamic(
  () => import('../board-bluetooth-control/send-climb-to-board-button').then((mod) => mod.default || mod),
  { ssr: false },
);

interface PlayViewDrawerProps {
  activeDrawer: ActiveDrawer;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  boardDetails: BoardDetails;
  angle: Angle;
}

// Stable no-op context to prevent child drawers from pushing the parent.
const noPushContext = { pushDistance: 0, push: () => {}, pull: () => {} };

const PlayViewDrawer: React.FC<PlayViewDrawerProps> = ({
  activeDrawer,
  setActiveDrawer,
  boardDetails,
  angle,
}) => {
  const isOpen = activeDrawer === 'play';
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const queueListRef = useRef<QueueListHandle>(null);
  const queueScrollRef = useRef<HTMLDivElement>(null);

  const {
    currentClimb,
    currentClimbQueueItem,
    mirrorClimb,
    queue,
    setQueue,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
    setCurrentClimbQueueItem,
    viewOnlyMode,
  } = useQueueContext();

  const { isFavorited, toggleFavorite } = useFavorite({
    climbUuid: currentClimb?.uuid ?? '',
  });

  const currentQueueIndex = currentClimbQueueItem
    ? queue.findIndex(item => item.uuid === currentClimbQueueItem.uuid)
    : -1;
  const remainingQueueCount = currentQueueIndex >= 0 ? queue.length - currentQueueIndex : queue.length;

  // Wake lock when drawer is open
  useWakeLock(isOpen);

  const handleToggleSelect = useCallback((uuid: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  }, []);

  const handleBulkRemove = useCallback(() => {
    setQueue(queue.filter((item) => !selectedItems.has(item.uuid)));
    setSelectedItems(new Set());
    setIsEditMode(false);
  }, [queue, selectedItems, setQueue]);

  const handleExitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSelectedItems(new Set());
  }, []);

  // Hash-based back button support
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState(null, '', '#playing');

    const handlePopState = () => {
      setActiveDrawer('none');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.location.hash === '#playing') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
  }, [isOpen, setActiveDrawer]);

  const handleClose = useCallback(() => {
    setActiveDrawer('none');
    if (window.location.hash === '#playing') {
      window.history.back();
    }
  }, [setActiveDrawer]);

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

  const enterFallbackRef = useRef<NodeJS.Timeout | null>(null);

  const { swipeHandlers, swipeOffset, isAnimating, animationDirection, enterDirection, clearEnterAnimation } = useCardSwipeNavigation({
    onSwipeNext: handleSwipeNext,
    onSwipePrevious: handleSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
    delayNavigation: true,
  });

  // Clear enterDirection after transition completes
  useEffect(() => {
    if (enterDirection) {
      enterFallbackRef.current = setTimeout(() => {
        clearEnterAnimation();
      }, 170);
    }
    return () => {
      if (enterFallbackRef.current) {
        clearTimeout(enterFallbackRef.current);
        enterFallbackRef.current = null;
      }
    };
  }, [enterDirection, clearEnterAnimation]);

  const getSwipeTransition = () => {
    if (enterDirection) return 'none';
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
  };

  // Peek: determine which climb to preview during swipe
  const showPeek = swipeOffset !== 0 || isAnimating;
  const peekIsNext = animationDirection === 'left' || (animationDirection === null && swipeOffset < 0);
  const peekItem = peekIsNext ? nextItem : prevItem;

  const getPeekTransform = () => {
    return peekIsNext
      ? `translateX(max(0px, calc(100% + ${swipeOffset}px)))`
      : `translateX(min(0px, calc(-100% + ${swipeOffset}px)))`;
  };

  const isMirrored = !!currentClimb?.mirrored;

  return (
    <SwipeableDrawer
      placement="bottom"
      height="100%"
      open={isOpen}
      onClose={handleClose}
      closable={false}
      push={false}
      swipeRegion="body"
      swipeEnabled={!isActionsOpen && !isQueueOpen}
      showDragHandle={true}
      styles={{
        body: { padding: 0, overflow: 'hidden', touchAction: 'none', overscrollBehaviorY: 'contain' },
        wrapper: { height: '100%' },
      }}
    >
      <div className={styles.drawerContent}>
        {/* Top bar: close button, ellipsis menu */}
        <div className={styles.topBar}>
          <Button
            type="text"
            icon={<DownOutlined />}
            onClick={handleClose}
            aria-label="Close play view"
          />
          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={() => {
              setIsQueueOpen(false);
              setIsActionsOpen(true);
            }}
            aria-label="Climb actions"
          />
        </div>

        {/* Board renderer with card-swipe */}
        <div className={styles.boardSection} {...swipeHandlers}>
          <div
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
          {showPeek && peekItem?.climb && (
            <div
              className={styles.peekBoardContainer}
              style={{
                transform: getPeekTransform(),
                transition: getSwipeTransition(),
              }}
            >
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHoldsMap={peekItem.climb.litUpHoldsMap}
                mirrored={!!peekItem.climb.mirrored}
                fillHeight
              />
            </div>
          )}
        </div>

        {/* Climb info below board */}
        <div className={styles.climbInfoSection}>
          <ClimbTitle
            climb={currentClimb}
            layout="horizontal"
            showSetterInfo
            showAngle
            centered
            titleFontSize={themeTokens.typography.fontSize.xl}
            rightAddon={currentClimb && <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} buttonType="text" />}
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
          <ShareBoardButton buttonType="text" />

          {/* LED */}
          <SendClimbToBoardButton buttonType="text" />

          {/* Queue */}
          <Badge count={remainingQueueCount} overflowCount={99} showZero={false} color="cyan">
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => {
                setIsActionsOpen(false);
                setIsQueueOpen(true);
              }}
              aria-label="Open queue"
            />
          </Badge>

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

      {/* Isolate child drawers from parent push context */}
      <DrawerContext.Provider value={noPushContext}>
        {/* Climb actions drawer */}
        {currentClimb && (
          <SwipeableDrawer
            title={currentClimb.name}
            placement="bottom"
            open={isActionsOpen}
            onClose={() => setIsActionsOpen(false)}
            getContainer={false}
            swipeRegion="body"
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
          </SwipeableDrawer>
        )}

        {/* Queue list drawer */}
        <SwipeableDrawer
          title="Queue"
          placement="bottom"
          height="60%"
          open={isQueueOpen}
          getContainer={false}
          onClose={() => {
            setIsQueueOpen(false);
            handleExitEditMode();
            setShowHistory(false);
          }}
          swipeRegion="scrollBody"
          scrollBodyRef={queueScrollRef}
          afterOpenChange={(open) => {
            if (open) {
              setTimeout(() => {
                queueListRef.current?.scrollToCurrentClimb();
              }, 100);
            }
          }}
          styles={{
            wrapper: { height: '60%' },
            body: { padding: 0 },
          }}
          extra={
            queue.length > 0 && !viewOnlyMode && (
              isEditMode ? (
                <Space>
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    style={{ color: themeTokens.neutral[400] }}
                    onClick={() => {
                      setQueue([]);
                      handleExitEditMode();
                    }}
                  >
                    Clear
                  </Button>
                  <Button type="text" icon={<CloseOutlined />} onClick={handleExitEditMode} />
                </Space>
              ) : (
                <Space>
                  <Button
                    type={showHistory ? 'default' : 'text'}
                    icon={<HistoryOutlined />}
                    onClick={() => setShowHistory((prev) => !prev)}
                  />
                  <Button type="text" icon={<EditOutlined />} onClick={() => setIsEditMode(true)} />
                </Space>
              )
            )
          }
        >
          <div className={styles.queueBodyLayout}>
            <div ref={queueScrollRef} className={styles.queueScrollContainer}>
              <QueueList
                ref={queueListRef}
                boardDetails={boardDetails}
                onClimbNavigate={() => {
                  setIsQueueOpen(false);
                  setActiveDrawer('none');
                }}
                isEditMode={isEditMode}
                showHistory={showHistory}
                selectedItems={selectedItems}
                onToggleSelect={handleToggleSelect}
              />
            </div>
            {isEditMode && selectedItems.size > 0 && (
              <div className={styles.bulkRemoveBar}>
                <Button type="primary" danger block onClick={handleBulkRemove}>
                  Remove {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
                </Button>
              </div>
            )}
          </div>
        </SwipeableDrawer>
      </DrawerContext.Provider>
    </SwipeableDrawer>
  );
};

export default PlayViewDrawer;
