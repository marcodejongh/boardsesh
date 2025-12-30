'use client';
import React, { useState, useCallback } from 'react';
import { Button, Row, Col, Card, Drawer, Space, Popconfirm } from 'antd';
import { SyncOutlined, DeleteOutlined, ExpandOutlined } from '@ant-design/icons';
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
import QueueList from './queue-list';
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

  const isViewPage = pathname.includes('/view/');
  const isListPage = pathname.includes('/list');
  const isPlayPage = pathname.includes('/play/');
  const { currentClimb, mirrorClimb, queue, setQueue, getNextClimbQueueItem, getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode } = useQueueContext();

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

  // Render climb content (used for current, previous, and next climbs)
  const renderClimbContent = (climb: typeof currentClimb, isCurrent: boolean) => (
    <Row justify="space-between" align="middle" style={{ width: '100%' }}>
      <Col xs={4}>
        <div style={boardPreviewContainerStyle}>
          <ClimbThumbnail
            boardDetails={boardDetails}
            currentClimb={climb}
            enableNavigation={isCurrent}
            onNavigate={() => setIsQueueOpen(false)}
          />
        </div>
      </Col>

      <Col xs={isCurrent ? 11 : 20} sm={11} style={{ textAlign: 'center' }}>
        <div
          onClick={isCurrent ? toggleQueueDrawer : undefined}
          className={isCurrent ? `${styles.queueToggle} ${isListPage ? styles.listPage : ''}` : undefined}
        >
          <ClimbTitle
            climb={climb}
            showAngle
            centered
            nameAddon={climb?.name && <AscentStatus climbUuid={climb.uuid} />}
          />
        </div>
      </Col>

      {/* Only show button cluster for current climb */}
      {isCurrent && (
        <Col xs={9} sm={9} style={{ textAlign: 'right' }}>
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
      )}
    </Row>
  );

  return (
    <div className="queue-bar-shadow" data-testid="queue-control-bar" style={{ flexShrink: 0, width: '100%', backgroundColor: '#fff' }}>
      {/* Main Control Bar */}
      <Card
        variant="borderless"
        styles={{
          body: {
            padding: '4px 12px 0px 12px',
          },
        }}
        style={{
          width: '100%',
          borderRadius: 0,
          margin: 0,
          borderTop: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        {/* Overflow container to clip carousel */}
        <div style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
          {/* Carousel container for swipe navigation */}
          <div
            {...swipeHandlers}
            className={styles.swipeContainer}
            style={{
              display: 'flex',
              width: '300%',
              marginLeft: '-100%',
              transform: `translateX(${swipeOffset}px)`,
              transition: swipeOffset === 0 ? `transform ${themeTokens.transitions.fast}` : 'none',
            }}
          >
            {/* Previous climb (left) */}
            <div className={styles.carouselSlide} style={{ width: '33.333%', flexShrink: 0, opacity: canSwipePrevious ? 1 : 0.3 }}>
              {previousClimb ? renderClimbContent(previousClimb.climb, false) : renderClimbContent(null, false)}
            </div>

            {/* Current climb (center) */}
            <div className={styles.carouselSlide} style={{ width: '33.333%', flexShrink: 0 }}>
              {renderClimbContent(currentClimb, true)}
            </div>

            {/* Next climb (right) */}
            <div className={styles.carouselSlide} style={{ width: '33.333%', flexShrink: 0, opacity: canSwipeNext ? 1 : 0.3 }}>
              {nextClimb ? renderClimbContent(nextClimb.climb, false) : renderClimbContent(null, false)}
            </div>
          </div>
        </div>
      </Card>

      {/* Drawer for showing the queue */}
      <Drawer
        title="Queue"
        placement="bottom"
        height="70%" // Adjust as per design preference
        open={isQueueOpen}
        onClose={toggleQueueDrawer}
        styles={{ body: { padding: 0 } }}
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
        <QueueList boardDetails={boardDetails} onClimbNavigate={() => setIsQueueOpen(false)} />
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
