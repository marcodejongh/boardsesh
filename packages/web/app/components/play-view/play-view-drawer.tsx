'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import MuiBadge from '@mui/material/Badge';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import SkipPreviousOutlined from '@mui/icons-material/SkipPreviousOutlined';
import SkipNextOutlined from '@mui/icons-material/SkipNextOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import dynamic from 'next/dynamic';
import { useQueueContext } from '../graphql-queue';
import { useFavorite, ClimbActions } from '../climb-actions';
import { ShareBoardButton } from '../board-page/share-button';
import { TickButton } from '../logbook/tick-button';
import QueueList, { QueueListHandle } from '../queue-control/queue-list';
import ClimbTitle from '../climb-card/climb-title';
import SwipeBoardCarousel from '../board-renderer/swipe-board-carousel';
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
          <IconButton
            onClick={handleClose}
            aria-label="Close play view"
          >
            <ExpandMoreOutlined />
          </IconButton>
          <IconButton
            onClick={() => {
              setIsQueueOpen(false);
              setIsActionsOpen(true);
            }}
            aria-label="Climb actions"
          >
            <MoreVertOutlined />
          </IconButton>
        </div>

        {/* Board renderer with card-swipe */}
        {isOpen && currentClimb && (
          <SwipeBoardCarousel
            boardDetails={boardDetails}
            currentClimb={currentClimb}
            nextClimb={nextItem?.climb}
            previousClimb={prevItem?.climb}
            onSwipeNext={handleSwipeNext}
            onSwipePrevious={handleSwipePrevious}
            canSwipeNext={canSwipeNext}
            canSwipePrevious={canSwipePrevious}
            className={styles.boardSection}
            boardContainerClassName={styles.swipeCardContainer}
          />
        )}

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
          <IconButton
            disabled={!canSwipePrevious}
            onClick={() => {
              const prev = getPreviousClimbQueueItem();
              if (prev) setCurrentClimbQueueItem(prev);
            }}
          >
            <SkipPreviousOutlined />
          </IconButton>

          {/* Mirror */}
          {boardDetails.supportsMirroring && (
            <IconButton
              color={isMirrored ? 'primary' : 'default'}
              onClick={() => mirrorClimb()}
              sx={
                isMirrored
                  ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple, color: '#fff', '&:hover': { backgroundColor: themeTokens.colors.purple } }
                  : undefined
              }
            >
              <SyncOutlined />
            </IconButton>
          )}

          {/* Favorite */}
          <IconButton
            onClick={() => toggleFavorite()}
          >
            {isFavorited ? <Favorite sx={{ color: themeTokens.colors.error }} /> : <FavoriteBorderOutlined />}
          </IconButton>

          {/* Party */}
          <ShareBoardButton buttonType="text" />

          {/* LED */}
          <SendClimbToBoardButton buttonType="text" />

          {/* Queue */}
          <MuiBadge badgeContent={remainingQueueCount} max={99} sx={{ '& .MuiBadge-badge': { backgroundColor: themeTokens.colors.primary, color: '#fff' } }}>
            <IconButton
              onClick={() => {
                setIsActionsOpen(false);
                setIsQueueOpen(true);
              }}
              aria-label="Open queue"
            >
              <FormatListBulletedOutlined />
            </IconButton>
          </MuiBadge>

          <IconButton
            disabled={!canSwipeNext}
            onClick={() => {
              const next = getNextClimbQueueItem();
              if (next) setCurrentClimbQueueItem(next);
            }}
          >
            <SkipNextOutlined />
          </IconButton>
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
                <Stack direction="row" spacing={1}>
                  <MuiButton
                    variant="text"
                    startIcon={<DeleteOutlined />}
                    sx={{ color: themeTokens.neutral[400] }}
                    onClick={() => {
                      setQueue([]);
                      handleExitEditMode();
                    }}
                  >
                    Clear
                  </MuiButton>
                  <IconButton onClick={handleExitEditMode}><CloseOutlined /></IconButton>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <IconButton
                    color={showHistory ? 'default' : 'default'}
                    onClick={() => setShowHistory((prev) => !prev)}
                    sx={showHistory ? { border: '1px solid', borderColor: 'divider' } : undefined}
                  >
                    <HistoryOutlined />
                  </IconButton>
                  <IconButton onClick={() => setIsEditMode(true)}><EditOutlined /></IconButton>
                </Stack>
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
                <MuiButton variant="contained" color="error" fullWidth onClick={handleBulkRemove}>
                  Remove {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
                </MuiButton>
              </div>
            )}
          </div>
        </SwipeableDrawer>
      </DrawerContext.Provider>
    </SwipeableDrawer>
  );
};

export default PlayViewDrawer;
