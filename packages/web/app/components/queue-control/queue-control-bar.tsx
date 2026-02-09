'use client';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import OpenInFullOutlined from '@mui/icons-material/OpenInFullOutlined';
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
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { themeTokens } from '@/app/theme/theme-config';
import { TOUR_DRAWER_EVENT } from '../onboarding/onboarding-tour';
import { ShareBoardButton } from '../board-page/share-button';
import { useCardSwipeNavigation, EXIT_DURATION, SNAP_BACK_DURATION, ENTER_ANIMATION_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import PlayViewDrawer from '../play-view/play-view-drawer';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { ConfirmPopover } from '@/app/components/ui/confirm-popover';
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
  const enterFallbackRef = useRef<NodeJS.Timeout | null>(null);

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
      if (enterFallbackRef.current) {
        clearTimeout(enterFallbackRef.current);
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

  const gradeTintColor = useMemo(() => getGradeTintColor(currentClimb?.difficulty), [currentClimb?.difficulty]);

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

  // Transition style shared by current and peek text
  const getTextTransitionStyle = () => {
    // After navigation completes, snap instantly (no transition) to avoid
    // the new text sliding in from the old exit position
    if (enterDirection) return 'none';
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
  };

  // Peek: determine which climb to preview during swipe
  const showPeek = swipeOffset !== 0 || isAnimating;
  const peekIsNext = animationDirection === 'left' || (animationDirection === null && swipeOffset < 0);
  const peekClimbData = peekIsNext ? nextClimb?.climb : previousClimb?.climb;

  // Peek transform: positioned one container-width away, moves with swipeOffset.
  // Clamped so the peek stops at position 0 and never overshoots past it
  // (the exit offset is window.innerWidth which is wider than the clip container).
  const getPeekTransform = () => {
    return peekIsNext
      ? `translateX(max(0px, calc(100% + ${swipeOffset}px)))`
      : `translateX(min(0px, calc(-100% + ${swipeOffset}px)))`;
  };

  // Clear enterDirection (for thumbnail crossfade) after it plays
  useEffect(() => {
    if (enterDirection) {
      enterFallbackRef.current = setTimeout(() => {
        clearEnterAnimation();
      }, ENTER_ANIMATION_DURATION);
    }
    return () => {
      if (enterFallbackRef.current) {
        clearTimeout(enterFallbackRef.current);
        enterFallbackRef.current = null;
      }
    };
  }, [enterDirection, clearEnterAnimation]);

  return (
    <div id="onboarding-queue-bar" className={`queue-bar-shadow ${styles.queueBar}`} data-testid="queue-control-bar">
      {/* Main Control Bar */}
      <MuiCard variant="outlined" className={styles.card} sx={{ border: 'none', background: 'transparent' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {/* Swipe container - captures swipe gestures, does NOT translate */}
        <div className={styles.swipeWrapper}>
          <div
            {...swipeHandlers}
            className={styles.swipeContainer}
            style={{
              padding: `6px ${themeTokens.spacing[3]}px 6px ${themeTokens.spacing[3]}px`,
              backgroundColor: gradeTintColor
                ? gradeTintColor.replace('hsl(', 'hsla(').replace(')', ', 0.6)')
                : 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }} className={styles.row}>
              {/* Left section: Thumbnail and climb info */}
              <Box sx={{ flex: 'auto' }} className={styles.climbInfoCol}>
                <div className={styles.climbInfoInner} style={{ gap: themeTokens.spacing[2] }}>
                  {/* Board preview — STATIC, with crossfade on enter */}
                  <div className={`${styles.boardPreviewContainer} ${enterDirection ? styles.thumbnailEnter : ''}`}>
                    <ClimbThumbnail
                      boardDetails={boardDetails}
                      currentClimb={currentClimb}
                      enableNavigation={true}
                      onNavigate={() => setActiveDrawer('none')}
                    />
                  </div>

                  {/* Text swipe clip — overflow hidden to contain sliding text */}
                  <div className={styles.textSwipeClip}>
                    {/* Current climb text — slides with finger */}
                    <div
                      id="onboarding-queue-toggle"
                      onClick={handleClimbInfoClick}
                      className={`${styles.queueToggle} ${isListPage ? styles.listPage : ''}`}
                      style={{
                        transform: `translateX(${swipeOffset}px)`,
                        transition: getTextTransitionStyle(),
                      }}
                    >
                      <ClimbTitle
                        climb={currentClimb}
                        showAngle
                      />
                    </div>

                    {/* Peek text — shows next/previous climb sliding in from the edge */}
                    {showPeek && peekClimbData && (
                      <div
                        className={`${styles.queueToggle} ${styles.peekText}`}
                        style={{
                          transform: getPeekTransform(),
                          transition: getTextTransitionStyle(),
                        }}
                      >
                        <ClimbTitle
                          climb={peekClimbData}
                          showAngle
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Box>

              {/* Button cluster — STATIC */}
              <Box sx={{ flex: 'none', marginLeft: `${themeTokens.spacing[2]}px` }}>
                <Stack direction="row" spacing={1}>
                  {/* Mirror button - desktop only */}
                  {boardDetails.supportsMirroring ? (
                    <span className={styles.desktopOnly}>
                      <IconButton
                        id="button-mirror"
                        onClick={() => {
                          mirrorClimb();
                          track('Mirror Climb Toggled', {
                            boardLayout: boardDetails.layout_name || '',
                            mirrored: !currentClimb?.mirrored,
                          });
                        }}
                        color={currentClimb?.mirrored ? 'primary' : 'default'}
                        sx={
                          currentClimb?.mirrored
                            ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple, color: 'common.white', '&:hover': { backgroundColor: themeTokens.colors.purple } }
                            : undefined
                        }
                      >
                        <SyncOutlined />
                      </IconButton>
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
                        <IconButton aria-label="Enter play mode"><OpenInFullOutlined /></IconButton>
                      </Link>
                    </span>
                  )}
                  {/* Navigation buttons - desktop only */}
                  <span className={styles.navButtons}>
                    <Stack direction="row" spacing={1}>
                      <PreviousClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
                      <NextClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
                    </Stack>
                  </span>
                  {/* Party button */}
                  <ShareBoardButton buttonType="text" />
                  {/* Tick button */}
                  <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} buttonType="text" />
                </Stack>
              </Box>
            </Box>
          </div>
        </div>
        </CardContent>
      </MuiCard>

      {/* Drawer for showing the queue */}
      <SwipeableDrawer
        title="Queue"
        placement="bottom"
        open={activeDrawer === 'queue'}
        onClose={() => setActiveDrawer('none')}
        onTransitionEnd={handleDrawerOpenChange}
        styles={{ wrapper: { height: '70%' }, body: { padding: 0 } }}
        extra={
          queue.length > 0 && (
            <ConfirmPopover
              title="Clear queue"
              description="Are you sure you want to clear all items from the queue?"
              onConfirm={handleClearQueue}
              okText="Clear"
              cancelText="Cancel"
            >
              <MuiButton variant="text" startIcon={<DeleteOutlined />} sx={{ color: themeTokens.neutral[400] }}>
                Clear
              </MuiButton>
            </ConfirmPopover>
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
