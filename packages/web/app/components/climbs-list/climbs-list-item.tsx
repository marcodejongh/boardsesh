'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Row, Col, Dropdown, Button, Typography } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { useSwipeable } from 'react-swipeable';
import BoardRenderer from '../board-renderer/board-renderer';
import { themeTokens } from '@/app/theme/theme-config';
import { ClimbsListItem, ClimbsListItemProps } from './types';
import styles from './climbs-list.module.css';

const { Text } = Typography;

// Threshold in pixels to trigger the swipe action
const SWIPE_THRESHOLD = 100;
// Maximum swipe distance
const MAX_SWIPE = 120;

// Pre-computed transition strings
const TRANSITION_FAST = `transform ${themeTokens.transitions.fast}, opacity ${themeTokens.transitions.fast}`;
const TRANSITION_NONE = 'none';

function ClimbsListItemComponent<T extends ClimbsListItem>({
  item,
  index,
  boardDetails,
  litUpHoldsMap,
  mirrored = false,
  title,
  subtitle,
  isSelected = false,
  isDisabled = false,
  menuItems,
  swipeLeftAction,
  swipeRightAction,
  onDoubleClick,
  draggable: isDraggable = true,
}: ClimbsListItemProps<T>) {
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftActionRef = useRef<HTMLDivElement>(null);
  const rightActionRef = useRef<HTMLDivElement>(null);

  // Update swipe visuals via DOM directly for smoother performance
  const updateSwipeVisuals = useCallback((offset: number) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${offset}px)`;
      contentRef.current.style.transition = offset === 0 ? TRANSITION_FAST : TRANSITION_NONE;
    }
    if (leftActionRef.current && swipeLeftAction) {
      const opacity = Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD);
      leftActionRef.current.style.opacity = String(offset < 0 ? opacity : 0);
      leftActionRef.current.style.visibility = offset < 0 ? 'visible' : 'hidden';
    }
    if (rightActionRef.current && swipeRightAction) {
      const opacity = Math.min(1, offset / SWIPE_THRESHOLD);
      rightActionRef.current.style.opacity = String(offset > 0 ? opacity : 0);
      rightActionRef.current.style.visibility = offset > 0 ? 'visible' : 'hidden';
    }
  }, [swipeLeftAction, swipeRightAction]);

  const handleSwipeLeft = useCallback(() => {
    if (!swipeLeftAction) return;
    setIsSwipeComplete(true);
    setTimeout(() => {
      swipeLeftAction.onSwipe();
      updateSwipeVisuals(0);
      setIsSwipeComplete(false);
    }, 200);
  }, [swipeLeftAction, updateSwipeVisuals]);

  const handleSwipeRight = useCallback(() => {
    if (!swipeRightAction) return;
    updateSwipeVisuals(0);
    swipeRightAction.onSwipe();
  }, [swipeRightAction, updateSwipeVisuals]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX, deltaY, event } = eventData;

      // On first movement, determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipeRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX > 10 || absY > 10) {
          isHorizontalSwipeRef.current = absX > absY;
        }
        return;
      }

      // If it's a vertical swipe, don't interfere
      if (!isHorizontalSwipeRef.current) {
        return;
      }

      // Horizontal swipe - prevent scroll and update offset
      if ('nativeEvent' in event) {
        event.nativeEvent.preventDefault();
      } else {
        event.preventDefault();
      }

      // Only allow swipe in directions that have actions
      let clampedOffset = deltaX;
      if (!swipeLeftAction && deltaX < 0) clampedOffset = 0;
      if (!swipeRightAction && deltaX > 0) clampedOffset = 0;
      clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, clampedOffset));

      // Update visuals via DOM for smoother performance (no re-render)
      updateSwipeVisuals(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      if (isHorizontalSwipeRef.current && swipeLeftAction && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else {
        updateSwipeVisuals(0);
      }
      isHorizontalSwipeRef.current = null;
    },
    onSwipedRight: (eventData) => {
      if (isHorizontalSwipeRef.current && swipeRightAction && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeRight();
      } else {
        updateSwipeVisuals(0);
      }
      isHorizontalSwipeRef.current = null;
    },
    onTouchEndOrOnMouseUp: () => {
      isHorizontalSwipeRef.current = null;
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  useEffect(() => {
    const element = itemRef.current;

    if (element && isDraggable) {
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
  }, [index, item.uuid, isDraggable]);

  // Memoize swipe action styles (static parts only, dynamic handled via refs)
  const rightActionStyle = useMemo(() => swipeRightAction ? ({
    left: 0,
    backgroundColor: swipeRightAction.color,
    justifyContent: 'flex-start' as const,
    paddingLeft: themeTokens.spacing[4],
    opacity: 0,
    visibility: 'hidden' as const,
  }) : undefined, [swipeRightAction]);

  const leftActionStyle = useMemo(() => swipeLeftAction ? ({
    right: 0,
    backgroundColor: swipeLeftAction.color,
    justifyContent: 'flex-end' as const,
    paddingRight: themeTokens.spacing[4],
    opacity: 0,
    visibility: 'hidden' as const,
  }) : undefined, [swipeLeftAction]);

  return (
    <div ref={itemRef} data-testid="climbs-list-item" className={styles.itemWrapper}>
      <div className={styles.itemContainer}>
        {/* Left action background (revealed on swipe right) */}
        {swipeRightAction && (
          <div
            ref={rightActionRef}
            className={styles.swipeAction}
            style={rightActionStyle}
          >
            {swipeRightAction.icon}
          </div>
        )}

        {/* Right action background (revealed on swipe left) */}
        {swipeLeftAction && (
          <div
            ref={leftActionRef}
            className={styles.swipeAction}
            style={leftActionStyle}
          >
            {swipeLeftAction.icon}
          </div>
        )}

        {/* Swipeable content */}
        <div
          ref={contentRef}
          {...swipeHandlers}
          className={styles.itemContent}
          style={useMemo(() => ({
            backgroundColor: isSelected
              ? themeTokens.semantic.selected
              : isDisabled
                ? themeTokens.neutral[100]
                : themeTokens.semantic.surface,
            opacity: isSwipeComplete ? 0 : isDisabled ? 0.6 : 1,
            cursor: isDraggable ? 'grab' : 'default',
            borderLeft: isSelected ? `3px solid ${themeTokens.colors.primary}` : undefined,
            // transform and transition handled via ref for smoother swiping
          }), [isSelected, isDisabled, isSwipeComplete, isDraggable])}
          onDoubleClick={onDoubleClick}
        >
          <Row style={{ width: '100%' }} gutter={[8, 8]} align="middle" wrap={false}>
            {/* Thumbnail */}
            <Col xs={6} sm={5}>
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHoldsMap={litUpHoldsMap}
                mirrored={mirrored}
                thumbnail
              />
            </Col>

            {/* Content */}
            <Col xs={menuItems ? 15 : 18} sm={menuItems ? 17 : 19}>
              <div className={styles.textContent}>
                <Text strong className={styles.title}>
                  {title}
                </Text>
                {subtitle && (
                  <Text type="secondary" className={styles.subtitle}>
                    {subtitle}
                  </Text>
                )}
              </div>
            </Col>

            {/* Menu */}
            {menuItems && menuItems.length > 0 && (
              <Col xs={3} sm={2}>
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
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
}

export default ClimbsListItemComponent;
