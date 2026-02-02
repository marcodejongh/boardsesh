'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Row, Col, Card, Drawer, Space, Popconfirm, Avatar, Tooltip } from 'antd';
import { SyncOutlined, DeleteOutlined, ExpandOutlined, FastForwardOutlined, FastBackwardOutlined, UserOutlined } from '@ant-design/icons';
import BluetoothIcon from './bluetooth-icon';
import { track } from '@vercel/analytics';
import { useSwipeable } from 'react-swipeable';
import { useQueueContext } from '../graphql-queue';
import NextClimbButton from './next-climb-button';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { constructPlayUrlWithSlugs, constructClimbViewUrlWithSlugs, parseBoardRouteParams } from '@/app/lib/url-utils';
import { BoardRouteParameters, BoardRouteParametersWithUuid } from '@/app/lib/types';
import PreviousClimbButton from './previous-climb-button';
import { BoardName, BoardDetails, Angle } from '@/app/lib/types';
import QueueList, { QueueListHandle } from './queue-list';
import { TickButton } from '../logbook/tick-button';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { AscentStatus } from './queue-list-item';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './queue-control-bar.module.css';

// Swipe threshold in pixels to trigger navigation
const SWIPE_THRESHOLD = 100;
// Maximum swipe distance (matches queue-list-item)
const MAX_SWIPE = 120;

export interface QueueControlBar {
  boardDetails: BoardDetails;
  board: BoardName;
  angle: Angle;
}

const QueueControlBar: React.FC<QueueControlBar> = ({ boardDetails, angle }: QueueControlBar) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const pathname = usePathname();
  const params = useParams<BoardRouteParameters>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queueListRef = useRef<QueueListHandle>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to current climb when drawer finishes opening
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (open) {
      // Small delay to ensure the drawer content is rendered
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

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX } = eventData;
      // Clamp the offset within bounds (matches queue-list-item)
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setSwipeOffset(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      setSwipeOffset(0);
      if (Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeNext();
      }
    },
    onSwipedRight: (eventData) => {
      setSwipeOffset(0);
      if (Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipePrevious();
      }
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
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
      // Fallback to numeric format
      baseUrl = `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/play/${currentClimb.uuid}`;
    }

    // Preserve the current search/filter params when entering play mode
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

  const toggleQueueDrawer = () => {
    // Don't open drawer on desktop when on list page (queue is in sidebar)
    if (isListPage && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const newState = !isQueueOpen;
    setIsQueueOpen(newState);
    track('Queue Drawer Toggled', {
      action: newState ? 'opened' : 'closed',
      boardLayout: boardDetails.layout_name || '',
    });
  };

  const canSwipeNext = !viewOnlyMode && !!nextClimb;
  const canSwipePrevious = !viewOnlyMode && !!previousClimb;

  // Calculate action visibility based on swipe offset (matches queue-list-item pattern)
  const showLeftAction = swipeOffset > 0; // Swiping right reveals "previous" action on left
  const showRightAction = swipeOffset < 0; // Swiping left reveals "next" action on right
  const leftActionOpacity = Math.min(1, swipeOffset / SWIPE_THRESHOLD);
  const rightActionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);

  return (
    <div className="queue-bar-shadow" data-testid="queue-control-bar" style={{ flexShrink: 0, width: '100%', backgroundColor: '#fff' }}>
      {/* Main Control Bar */}
      <Card
        variant="borderless"
        styles={{
          body: {
            padding: 0,
          },
        }}
        style={{
          width: '100%',
          borderRadius: 0,
          margin: 0,
          borderTop: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        {/* Swipe container with action backgrounds */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Left action background (previous - revealed on swipe right) */}
          {canSwipePrevious && (
            <div
              className={styles.swipeAction}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: MAX_SWIPE,
                backgroundColor: themeTokens.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: themeTokens.spacing[4],
                opacity: leftActionOpacity,
                visibility: showLeftAction ? 'visible' : 'hidden',
              }}
            >
              <FastBackwardOutlined style={{ color: 'white', fontSize: 24 }} />
            </div>
          )}

          {/* Right action background (next - revealed on swipe left) */}
          {canSwipeNext && (
            <div
              className={styles.swipeAction}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: MAX_SWIPE,
                backgroundColor: themeTokens.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: themeTokens.spacing[4],
                opacity: rightActionOpacity,
                visibility: showRightAction ? 'visible' : 'hidden',
              }}
            >
              <FastForwardOutlined style={{ color: 'white', fontSize: 24 }} />
            </div>
          )}

          {/* Swipeable content */}
          <div
            {...swipeHandlers}
            className={styles.swipeContainer}
            style={{
              padding: '4px 12px 0px 12px',
              transform: `translateX(${swipeOffset}px)`,
              transition: swipeOffset === 0 ? `transform ${themeTokens.transitions.fast}` : 'none',
              backgroundColor: '#fff',
            }}
          >
            <Row justify="space-between" align="middle" style={{ width: '100%' }}>
              <Col xs={4}>
                {/* Board preview */}
                <div style={boardPreviewContainerStyle}>
                  <ClimbThumbnail
                    boardDetails={boardDetails}
                    currentClimb={currentClimb}
                    enableNavigation={true}
                    onNavigate={() => setIsQueueOpen(false)}
                  />
                </div>
              </Col>

              {/* Clickable main body for opening the queue */}
              <Col xs={10} style={{ textAlign: 'center' }}>
                <div onClick={toggleQueueDrawer} className={`${styles.queueToggle} ${isListPage ? styles.listPage : ''}`}>
                  <ClimbTitle
                    climb={currentClimb}
                    showAngle
                    centered
                    nameAddon={currentClimb?.name && <AscentStatus climbUuid={currentClimb.uuid} />}
                  />
                </div>
              </Col>

              {/* Added by indicator (user avatar or Bluetooth icon) */}
              {currentClimbQueueItem && (
                <Col xs={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentClimbQueueItem.addedByUser ? (
                    <Tooltip title={currentClimbQueueItem.addedByUser.username}>
                      <Avatar size="small" src={currentClimbQueueItem.addedByUser.avatarUrl} icon={<UserOutlined />} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Added via Bluetooth">
                      <Avatar
                        size="small"
                        style={{ backgroundColor: 'transparent' }}
                        icon={<BluetoothIcon style={{ color: themeTokens.neutral[400] }} />}
                      />
                    </Tooltip>
                  )}
                </Col>
              )}

              {/* Button cluster */}
              <Col xs={9} style={{ textAlign: 'right' }}>
                <Space>
                  {boardDetails.supportsMirroring ? (
                    <Button
                      id="button-mirror"
                      onClick={() => {
                        mirrorClimb();
                        track('Mirror Climb Toggled', {
                          boardLayout: boardDetails.layout_name || '',
                          mirrored: !currentClimb?.mirrored,
                        });
                      }}
                      type={currentClimb?.mirrored ? 'primary' : 'default'}
                      style={
                        currentClimb?.mirrored
                          ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple }
                          : undefined
                      }
                      icon={<SyncOutlined />}
                    />
                  ) : null}
                  {!isPlayPage && playUrl && (
                    <Link
                      href={playUrl}
                      onClick={() => {
                        track('Play Mode Entered', {
                          boardLayout: boardDetails.layout_name || '',
                        });
                      }}
                    >
                      <Button icon={<ExpandOutlined />} aria-label="Enter play mode" />
                    </Link>
                  )}
                  {/* Navigation buttons - hidden on mobile, shown on desktop */}
                  <span className={styles.navButtons}>
                    <Space>
                      <PreviousClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
                      <NextClimbButton navigate={isViewPage || isPlayPage} boardDetails={boardDetails} />
                    </Space>
                  </span>
                  <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} />
                </Space>
              </Col>
            </Row>
          </div>
        </div>
      </Card>

      {/* Drawer for showing the queue */}
      <Drawer
        title="Queue"
        placement="bottom"
        open={isQueueOpen}
        onClose={toggleQueueDrawer}
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
        <QueueList ref={queueListRef} boardDetails={boardDetails} onClimbNavigate={() => setIsQueueOpen(false)} />
      </Drawer>
    </div>
  );
};

const boardPreviewContainerStyle = {
  width: '100%', // Using 100% width for flexibility
  height: 'auto', // Auto height to maintain aspect ratio
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
};

export default QueueControlBar;
