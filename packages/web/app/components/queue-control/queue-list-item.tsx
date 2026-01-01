import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Avatar, Tooltip, Dropdown, Button } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, DeleteOutlined, MoreOutlined, InfoCircleOutlined, InstagramOutlined } from '@ant-design/icons';
import { BoardDetails, ClimbUuid, Climb } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { useSwipeable } from 'react-swipeable';
import { ClimbQueueItem } from './types';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { themeTokens } from '@/app/theme/theme-config';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, parseBoardRouteParams } from '@/app/lib/url-utils';

type QueueListItemProps = {
  item: ClimbQueueItem;
  index: number;
  isCurrent: boolean;
  isHistory: boolean;
  viewOnlyMode: boolean;
  boardDetails: BoardDetails;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
  removeFromQueue: (item: ClimbQueueItem) => void;
  onTickClick: (climb: Climb) => void;
  onInstagramClick: (climb: Climb) => void;
  onClimbNavigate?: () => void;
};

export const AscentStatus = ({ climbUuid }: { climbUuid: ClimbUuid }) => {
  const { logbook, boardName } = useBoardProvider();

  const ascentsForClimb = logbook.filter((ascent) => ascent.climb_uuid === climbUuid);

  const hasSuccessfulAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && !is_mirror);
  const hasSuccessfulMirroredAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && is_mirror);
  const hasAttempts = ascentsForClimb.length > 0;
  const supportsMirroring = boardName === 'tension';

  if (!hasAttempts) return null;

  if (supportsMirroring) {
    return (
      <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center' }}>
        {/* Regular ascent icon */}
        {hasSuccessfulAscent ? (
          <div style={{ position: 'absolute', left: 0 }}>
            <CheckOutlined style={{ color: themeTokens.colors.success }} />
          </div>
        ) : null}
        {/* Mirrored ascent icon */}
        {hasSuccessfulMirroredAscent ? (
          <div
            style={{
              position: 'absolute',
              transform: 'scaleX(-1)',
              left: '2px',
            }}
          >
            <CheckOutlined style={{ color: themeTokens.colors.success }} />
          </div>
        ) : null}
        {!hasSuccessfulMirroredAscent && !hasSuccessfulAscent ? (
          <CloseOutlined style={{ color: themeTokens.colors.error, position: 'absolute', left: 0 }} />
        ) : null}
      </div>
    );
  }

  // Single icon for non-mirroring boards
  return hasSuccessfulAscent ? (
    <CheckOutlined style={{ color: themeTokens.colors.success }} />
  ) : (
    <CloseOutlined style={{ color: themeTokens.colors.error }} />
  );
};

// Threshold in pixels to trigger the swipe action
const SWIPE_THRESHOLD = 100;
// Maximum swipe distance
const MAX_SWIPE = 120;

const QueueListItem: React.FC<QueueListItemProps> = ({
  item,
  index,
  isCurrent,
  isHistory,
  boardDetails,
  setCurrentClimbQueueItem,
  removeFromQueue,
  onTickClick,
  onInstagramClick,
  onClimbNavigate,
}) => {
  const router = useRouter();
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleViewClimb = useCallback(() => {
    if (!item.climb) return;

    const climbViewUrl =
      boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
        ? constructClimbViewUrlWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            item.climb.angle,
            item.climb.uuid,
            item.climb.name,
          )
        : (() => {
            const routeParams = parseBoardRouteParams({
              board_name: boardDetails.board_name,
              layout_id: boardDetails.layout_id.toString(),
              size_id: boardDetails.size_id.toString(),
              set_ids: boardDetails.set_ids.join(','),
              angle: item.climb.angle.toString(),
            });
            return constructClimbViewUrl(routeParams, item.climb.uuid, item.climb.name);
          })();

    onClimbNavigate?.();
    router.push(climbViewUrl);
  }, [item.climb, boardDetails, onClimbNavigate, router]);

  const handleSwipeLeft = useCallback(() => {
    // Swipe left = remove from queue
    setIsSwipeComplete(true);
    setTimeout(() => {
      removeFromQueue(item);
      setSwipeOffset(0);
      setIsSwipeComplete(false);
    }, 200);
  }, [item, removeFromQueue]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = tick (open tick drawer)
    setSwipeOffset(0);
    if (item.climb) {
      onTickClick(item.climb);
    }
  }, [item.climb, onTickClick]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX, deltaY, event } = eventData;

      // On first movement, determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipe === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        // Need a minimum movement to determine direction
        if (absX > 10 || absY > 10) {
          setIsHorizontalSwipe(absX > absY);
        }
        return;
      }

      // If it's a vertical swipe, don't interfere - let scrolling happen
      if (!isHorizontalSwipe) {
        return;
      }

      // It's a horizontal swipe - prevent scroll and update offset
      // Access native event for reliable preventDefault on touch events
      if ('nativeEvent' in event) {
        event.nativeEvent.preventDefault();
      } else {
        event.preventDefault();
      }
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setSwipeOffset(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      if (isHorizontalSwipe && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onSwipedRight: (eventData) => {
      if (isHorizontalSwipe && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeRight();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset if swipe didn't complete
      if (Math.abs(swipeOffset) < SWIPE_THRESHOLD) {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  useEffect(() => {
    const element = itemRef.current;

    if (element) {
      return combine(
        draggable({
          element,
          getInitialData: () => ({ index, id: item.uuid }),
        }),
        dropTargetForElements({
          element,
          getData: ({ input }) =>
            attachClosestEdge(
              { index, id: item.uuid },
              {
                element,
                input,
                allowedEdges: ['top', 'bottom'],
              },
            ),
          onDrag({ self }) {
            const edge = extractClosestEdge(self.data);
            setClosestEdge(edge);
          },
          onDragLeave() {
            setClosestEdge(null);
          },
          onDrop() {
            setClosestEdge(null);
          },
        }),
      );
    }
  }, [index, item.uuid]);

  // Calculate action visibility based on swipe offset
  const showLeftAction = swipeOffset < 0; // Swiping left reveals delete action on right
  const showRightAction = swipeOffset > 0; // Swiping right reveals tick action on left
  const leftActionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);
  const rightActionOpacity = Math.min(1, swipeOffset / SWIPE_THRESHOLD);

  return (
    <div ref={itemRef} data-testid="queue-item">
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        {/* Left action background (tick - revealed on swipe right) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.success,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: themeTokens.spacing[4],
            opacity: rightActionOpacity,
            visibility: showRightAction ? 'visible' : 'hidden',
          }}
        >
          <CheckOutlined style={{ color: 'white', fontSize: 20 }} />
        </div>

        {/* Right action background (delete - revealed on swipe left) */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.error,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: themeTokens.spacing[4],
            opacity: leftActionOpacity,
            visibility: showLeftAction ? 'visible' : 'hidden',
          }}
        >
          <DeleteOutlined style={{ color: 'white', fontSize: 20 }} />
        </div>

        {/* Swipeable content */}
        <div
          {...swipeHandlers}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 8px',
            backgroundColor: isCurrent
              ? themeTokens.semantic.selected
              : isHistory
                ? themeTokens.neutral[100]
                : themeTokens.semantic.surface,
            opacity: isSwipeComplete ? 0 : isHistory ? 0.6 : 1,
            cursor: 'grab',
            position: 'relative',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none',
            borderLeft: isCurrent ? `3px solid ${themeTokens.colors.primary}` : undefined,
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 || isSwipeComplete ? `transform ${themeTokens.transitions.fast}, opacity ${themeTokens.transitions.fast}` : 'none',
          }}
          onDoubleClick={() => setCurrentClimbQueueItem(item)}
        >
          <Row style={{ width: '100%' }} gutter={[8, 8]} align="middle" wrap={false}>
            <Col xs={6} sm={5}>
              <ClimbThumbnail
                boardDetails={boardDetails}
                currentClimb={item.climb}
              />
            </Col>
            <Col xs={item.addedByUser ? 13 : 15} sm={item.addedByUser ? 15 : 17}>
              <ClimbTitle
                climb={item.climb}
                showAngle
                centered
                nameAddon={<AscentStatus climbUuid={item.climb?.uuid} />}
              />
            </Col>
            {item.addedByUser && (
              <Col xs={2} sm={2}>
                <Tooltip title={item.addedByUser.username}>
                  <Avatar size="small" src={item.addedByUser.avatarUrl} icon={<UserOutlined />} />
                </Tooltip>
              </Col>
            )}
            <Col xs={3} sm={2}>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'info',
                      label: 'View Climb',
                      icon: <InfoCircleOutlined />,
                      onClick: handleViewClimb,
                    },
                    {
                      key: 'instagram',
                      label: 'Beta Videos',
                      icon: <InstagramOutlined />,
                      onClick: () => item.climb && onInstagramClick(item.climb),
                    },
                    {
                      key: 'tick',
                      label: 'Tick Climb',
                      icon: <CheckOutlined />,
                      onClick: () => item.climb && onTickClick(item.climb),
                    },
                    {
                      key: 'remove',
                      label: 'Remove from Queue',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: () => removeFromQueue(item),
                    },
                  ],
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            </Col>
          </Row>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </div>
    </div>
  );
};

export default QueueListItem;
