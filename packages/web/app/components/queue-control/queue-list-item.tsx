import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Avatar, Tooltip, Dropdown, Button } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, DeleteOutlined, MoreOutlined, InfoCircleOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Checkbox } from 'antd';
import BluetoothIcon from './bluetooth-icon';
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
import { getGradeTintColor, getGradeColor } from '@/app/lib/grade-colors';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, parseBoardRouteParams, constructClimbInfoUrl } from '@/app/lib/url-utils';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import styles from './queue-list-item.module.css';

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
  onClimbNavigate?: () => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (uuid: string) => void;
};

export const AscentStatus = ({ climbUuid, fontSize }: { climbUuid: ClimbUuid; fontSize?: number }) => {
  const { logbook, boardName } = useBoardProvider();

  const ascentsForClimb = useMemo(
    () => logbook.filter((ascent) => ascent.climb_uuid === climbUuid),
    [logbook, climbUuid],
  );

  const hasSuccessfulAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && !is_mirror);
  const hasSuccessfulMirroredAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && is_mirror);
  const hasAttempts = ascentsForClimb.length > 0;
  const supportsMirroring = boardName === 'tension';

  if (!hasAttempts) return null;

  if (supportsMirroring) {
    return (
      <div className={styles.ascentStatusContainer}>
        {/* Regular ascent icon */}
        {hasSuccessfulAscent ? (
          <div className={styles.ascentIconRegular}>
            <CheckOutlined style={{ color: themeTokens.neutral[400], fontSize }} />
          </div>
        ) : null}
        {/* Mirrored ascent icon */}
        {hasSuccessfulMirroredAscent ? (
          <div className={styles.ascentIconMirrored}>
            <CheckOutlined style={{ color: themeTokens.neutral[400], fontSize }} />
          </div>
        ) : null}
        {!hasSuccessfulMirroredAscent && !hasSuccessfulAscent ? (
          <CloseOutlined className={styles.ascentIconRegular} style={{ color: themeTokens.colors.error, fontSize }} />
        ) : null}
      </div>
    );
  }

  // Single icon for non-mirroring boards
  return hasSuccessfulAscent ? (
    <CheckOutlined style={{ color: themeTokens.neutral[400], fontSize }} />
  ) : (
    <CloseOutlined style={{ color: themeTokens.colors.error, fontSize }} />
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
  onClimbNavigate,
  isEditMode = false,
  isSelected = false,
  onToggleSelect,
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

  const handleOpenInApp = useCallback(() => {
    if (!item.climb) return;
    const url = constructClimbInfoUrl(boardDetails, item.climb.uuid, item.climb.angle);
    window.open(url, '_blank', 'noopener');
  }, [item.climb, boardDetails]);

  const doubleTapCallback = useCallback(() => {
    if (!isEditMode) {
      setCurrentClimbQueueItem(item);
    }
  }, [isEditMode, setCurrentClimbQueueItem, item]);

  const { ref: doubleTapRef, onDoubleClick: handleDoubleTap } = useDoubleTap(isEditMode ? undefined : doubleTapCallback);

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
    if (isEditMode) return;
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
  }, [index, item.uuid, isEditMode]);

  // Calculate action visibility based on swipe offset
  const showLeftAction = swipeOffset < 0; // Swiping left reveals delete action on right
  const showRightAction = swipeOffset > 0; // Swiping right reveals tick action on left
  const leftActionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);
  const rightActionOpacity = Math.min(1, swipeOffset / SWIPE_THRESHOLD);

  return (
    <div ref={itemRef} data-testid="queue-item">
      <div
        className={styles.itemWrapper}
        style={{ borderBottom: `1px solid ${themeTokens.neutral[200]}` }}
      >
        {/* Left action background (tick - revealed on swipe right) */}
        <div
          className={styles.leftAction}
          style={{
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.success,
            paddingLeft: themeTokens.spacing[4],
            opacity: rightActionOpacity,
            visibility: showRightAction ? 'visible' : 'hidden',
          }}
        >
          <CheckOutlined className={styles.actionIcon} />
        </div>

        {/* Right action background (delete - revealed on swipe left) */}
        <div
          className={styles.rightAction}
          style={{
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.error,
            paddingRight: themeTokens.spacing[4],
            opacity: leftActionOpacity,
            visibility: showLeftAction ? 'visible' : 'hidden',
          }}
        >
          <DeleteOutlined className={styles.actionIcon} />
        </div>

        {/* Swipeable content */}
        <div
          {...(isEditMode ? {} : swipeHandlers)}
          ref={isEditMode ? undefined : (node: HTMLDivElement | null) => {
            doubleTapRef(node);
            swipeHandlers.ref(node);
          }}
          className={styles.swipeableContent}
          style={{
            padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[2]}px`,
            backgroundColor: isCurrent
              ? (getGradeTintColor(item.climb?.difficulty, 'light') ?? themeTokens.semantic.selected)
              : isHistory
                ? themeTokens.neutral[100]
                : themeTokens.semantic.surface,
            opacity: isSwipeComplete ? 0 : isHistory ? 0.6 : 1,
            borderLeft: isCurrent ? `3px solid ${getGradeColor(item.climb?.difficulty) ?? themeTokens.colors.primary}` : undefined,
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 || isSwipeComplete ? `transform ${themeTokens.transitions.fast}, opacity ${themeTokens.transitions.fast}` : 'none',
            cursor: isEditMode ? 'pointer' : undefined,
          }}
          onDoubleClick={isEditMode ? undefined : handleDoubleTap}
          onClick={isEditMode ? () => onToggleSelect?.(item.uuid) : undefined}
        >
          <Row className={styles.contentRow} gutter={[8, 8]} align="middle" wrap={false}>
            {isEditMode && (
              <Col xs={2} sm={2}>
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect?.(item.uuid)}
                />
              </Col>
            )}
            <Col xs={isEditMode ? 5 : 6} sm={isEditMode ? 4 : 5}>
              <ClimbThumbnail
                boardDetails={boardDetails}
                currentClimb={item.climb}
              />
            </Col>
            <Col xs={isEditMode ? 14 : 13} sm={isEditMode ? 16 : 15}>
              <ClimbTitle
                climb={item.climb}
                showAngle
                centered
                nameAddon={<AscentStatus climbUuid={item.climb?.uuid} />}
              />
            </Col>
            <Col xs={2} sm={2}>
              {item.addedByUser ? (
                <Tooltip title={item.addedByUser.username}>
                  <Avatar size="small" src={item.addedByUser.avatarUrl} icon={<UserOutlined />} />
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
            {!isEditMode && (
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
                        key: 'tick',
                        label: 'Tick Climb',
                        icon: <CheckOutlined />,
                        onClick: () => item.climb && onTickClick(item.climb),
                      },
                      {
                        key: 'openInApp',
                        label: 'Open in App',
                        icon: <AppstoreOutlined />,
                        onClick: handleOpenInApp,
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
            )}
          </Row>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </div>
    </div>
  );
};

export default React.memo(QueueListItem);
