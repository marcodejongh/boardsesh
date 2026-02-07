'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Space, Popconfirm } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { SyncOutlined, DeleteOutlined, ExpandOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { useQueueContext } from '../graphql-queue';
import NextClimbButton from './next-climb-button';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { constructPlayUrlWithSlugs, constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import { BoardRouteParameters, BoardDetails, Angle } from '@/app/lib/types';
import PreviousClimbButton from './previous-climb-button';
import QueueList, { QueueListHandle } from './queue-list';
import { TickButton } from '../logbook/tick-button';
import { themeTokens } from '@/app/theme/theme-config';
import { TOUR_DRAWER_EVENT } from '../onboarding/onboarding-tour';
import { ShareBoardButton } from '../board-page/share-button';
import { useCardSwipeNavigation } from '@/app/hooks/use-card-swipe-navigation';
import PlayViewDrawer from '../play-view/play-view-drawer';
import QueueBarContent from './queue-bar-content';
import styles from './queue-control-bar.module.css';

export type ActiveDrawer = 'none' | 'play' | 'queue';

export interface QueueControlBarProps {
  boardDetails: BoardDetails;
  angle: Angle;
}

const QueueControlBar: React.FC<QueueControlBarProps> = ({ boardDetails, angle }) => {
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');
  const pathname = usePathname();
  const params = useParams<BoardRouteParameters>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queueListRef = useRef<QueueListHandle>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset activeDrawer on navigation
  useEffect(() => {
    setActiveDrawer('none');
  }, [pathname]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Listen for tour events to open/close the queue drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const { open } = (e as CustomEvent<{ open: boolean }>).detail;
      setActiveDrawer(open ? 'queue' : 'none');
    };
    window.addEventListener(TOUR_DRAWER_EVENT, handler);
    return () => window.removeEventListener(TOUR_DRAWER_EVENT, handler);
  }, []);

  // Scroll to current climb when drawer finishes opening
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (open) {
      scrollTimeoutRef.current = setTimeout(() => {
        queueListRef.current?.scrollToCurrentClimb();
      }, 100);
    }
  }, []);

  const isViewPage = pathname.includes('/view/');
  const isListPage = pathname.includes('/list');
  const isPlayPage = pathname.includes('/play/');
  const { currentClimb, currentClimbQueueItem, mirrorClimb, queue, setQueue, getNextClimbQueueItem, getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode } = useQueueContext();

  const nextClimb = getNextClimbQueueItem();
  const previousClimb = getPreviousClimbQueueItem();
  const shouldNavigate = isViewPage || isPlayPage;

  // Build URL for a climb item (for navigation on view/play pages)
  const buildClimbUrl = useCallback((climb: { uuid: string; name: string }) => {
    const urlConstructor = isPlayPage ? constructPlayUrlWithSlugs : constructClimbViewUrlWithSlugs;
    const fallbackPath = isPlayPage ? 'play' : 'view';

    let climbUrl = boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
      ? urlConstructor(
          boardDetails.board_name,
          boardDetails.layout_name,
          boardDetails.size_name,
          boardDetails.size_description,
          boardDetails.set_names,
          angle,
          climb.uuid,
          climb.name,
        )
      : `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/${fallbackPath}/${climb.uuid}`;

    // Preserve search params in play mode
    if (isPlayPage) {
      const queryString = searchParams.toString();
      if (queryString) {
        climbUrl = `${climbUrl}?${queryString}`;
      }
    }
    return climbUrl;
  }, [boardDetails, angle, params, searchParams, isPlayPage]);

  // Handle swipe navigation
  const handleSwipeNext = useCallback(() => {
    if (!nextClimb || viewOnlyMode) return;

    setCurrentClimbQueueItem(nextClimb);
    track('Queue Navigation', {
      direction: 'next',
      method: 'swipe',
      boardLayout: boardDetails?.layout_name || '',
    });

    if (shouldNavigate) {
      router.push(buildClimbUrl(nextClimb.climb));
    }
  }, [nextClimb, viewOnlyMode, setCurrentClimbQueueItem, shouldNavigate, router, buildClimbUrl, boardDetails]);

  const handleSwipePrevious = useCallback(() => {
    if (!previousClimb || viewOnlyMode) return;

    setCurrentClimbQueueItem(previousClimb);
    track('Queue Navigation', {
      direction: 'previous',
      method: 'swipe',
      boardLayout: boardDetails?.layout_name || '',
    });

    if (shouldNavigate) {
      router.push(buildClimbUrl(previousClimb.climb));
    }
  }, [previousClimb, viewOnlyMode, setCurrentClimbQueueItem, shouldNavigate, router, buildClimbUrl, boardDetails]);

  const canSwipeNext = !viewOnlyMode && !!nextClimb;
  const canSwipePrevious = !viewOnlyMode && !!previousClimb;

  const { swipeHandlers, swipeOffset, isAnimating, animationDirection, enterDirection, clearEnterAnimation } = useCardSwipeNavigation({
    onSwipeNext: handleSwipeNext,
    onSwipePrevious: handleSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
    delayNavigation: true,
  });

  const getPlayUrl = () => {
    if (!currentClimb) return null;

    const { layout_name, size_name, size_description, set_names, board_name } = boardDetails;

    let baseUrl: string;
    if (layout_name && size_name && set_names) {
      baseUrl = constructPlayUrlWithSlugs(
        board_name,
        layout_name,
        size_name,
        size_description,
        set_names,
        angle,
        currentClimb.uuid,
        currentClimb.name,
      );
    } else {
      baseUrl = `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/play/${currentClimb.uuid}`;
    }

    const queryString = searchParams.toString();
    if (queryString) {
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  };

  const playUrl = getPlayUrl();

  const handleClearQueue = () => {
    setQueue([]);
    track('Queue Cleared', {
      boardLayout: boardDetails.layout_name || '',
      itemsCleared: queue.length,
    });
  };

  const handleClimbInfoClick = useCallback(() => {
    // On desktop list page, no-op (queue is in sidebar)
    if (isListPage && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    // On mobile, open play drawer — only if there's a current climb
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      if (!currentClimb) return;
      setActiveDrawer('play');
      track('Play Drawer Opened', {
        boardLayout: boardDetails.layout_name || '',
        source: 'bar_tap',
      });
      return;
    }

    // On desktop, open queue drawer
    setActiveDrawer((prev) => prev === 'queue' ? 'none' : 'queue');
    track('Queue Drawer Toggled', {
      action: activeDrawer === 'queue' ? 'closed' : 'opened',
      boardLayout: boardDetails.layout_name || '',
    });
  }, [isListPage, boardDetails, activeDrawer, currentClimb]);

  return (
    <div id="onboarding-queue-bar" className={`queue-bar-shadow ${styles.queueBar}`} data-testid="queue-control-bar">
      <QueueBarContent
        boardDetails={boardDetails}
        currentClimb={currentClimb}
        nextClimb={nextClimb?.climb ?? null}
        prevClimb={previousClimb?.climb ?? null}
        swipeHandlers={swipeHandlers}
        swipeOffset={swipeOffset}
        isAnimating={isAnimating}
        animationDirection={animationDirection}
        enterDirection={enterDirection}
        clearEnterAnimation={clearEnterAnimation}
        onClimbInfoClick={handleClimbInfoClick}
        climbInfoClassName={isListPage ? styles.listPage : undefined}
        climbInfoId="onboarding-queue-toggle"
        enableThumbnailNavigation={true}
        onThumbnailNavigate={() => setActiveDrawer('none')}
        actionButtons={
          <Space>
            {/* Mirror button - desktop only */}
            {boardDetails.supportsMirroring ? (
              <span className={styles.desktopOnly}>
                <Button
                  id="button-mirror"
                  onClick={() => {
                    mirrorClimb();
                    track('Mirror Climb Toggled', {
                      boardLayout: boardDetails.layout_name || '',
                      mirrored: !currentClimb?.mirrored,
                    });
                  }}
                  type={currentClimb?.mirrored ? 'primary' : 'text'}
                  style={
                    currentClimb?.mirrored
                      ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple }
                      : undefined
                  }
                  icon={<SyncOutlined />}
                />
              </span>
            ) : null}
            {/* Play link - desktop only */}
            {!isPlayPage && playUrl && (
              <span className={styles.desktopOnly}>
                <Link
                  href={playUrl}
                  onClick={() => {
                    track('Play Mode Entered', {
                      boardLayout: boardDetails.layout_name || '',
                    });
                  }}
                >
                  <Button type="text" icon={<ExpandOutlined />} aria-label="Enter play mode" />
                </Link>
              </span>
            )}
            {/* Navigation buttons - desktop only */}
            <span className={styles.navButtons}>
              <Space>
                <PreviousClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
                <NextClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
              </Space>
            </span>
            {/* Party button */}
            <ShareBoardButton buttonType="text" />
            {/* Tick button */}
            <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} buttonType="text" />
          </Space>
        }
      />

      {/* Drawer for showing the queue */}
      <SwipeableDrawer
        title="Queue"
        placement="bottom"
        open={activeDrawer === 'queue'}
        onClose={() => setActiveDrawer('none')}
        afterOpenChange={handleDrawerOpenChange}
        styles={{ wrapper: { height: '70%' }, body: { padding: 0 } }}
        extra={
          queue.length > 0 && (
            <Popconfirm
              title="Clear queue"
              description="Are you sure you want to clear all items from the queue?"
              onConfirm={handleClearQueue}
              okText="Clear"
              cancelText="Cancel"
            >
              <Button type="text" icon={<DeleteOutlined />} style={{ color: themeTokens.neutral[400] }}>
                Clear
              </Button>
            </Popconfirm>
          )
        }
      >
        <QueueList ref={queueListRef} boardDetails={boardDetails} onClimbNavigate={() => setActiveDrawer('none')} />
      </SwipeableDrawer>

      {/* Play view drawer - mobile only */}
      <PlayViewDrawer
        activeDrawer={activeDrawer}
        setActiveDrawer={setActiveDrawer}
        boardDetails={boardDetails}
        angle={angle}
      />
    </div>
  );
};

export default QueueControlBar;
