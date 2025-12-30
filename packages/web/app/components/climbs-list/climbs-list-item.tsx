'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleSwipeLeft = useCallback(() => {
    if (!swipeLeftAction) return;
    setIsSwipeComplete(true);
    setTimeout(() => {
      swipeLeftAction.onSwipe();
      setSwipeOffset(0);
      setIsSwipeComplete(false);
    }, 200);
  }, [swipeLeftAction]);

  const handleSwipeRight = useCallback(() => {
    if (!swipeRightAction) return;
    setSwipeOffset(0);
    swipeRightAction.onSwipe();
  }, [swipeRightAction]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX, deltaY, event } = eventData;

      // On first movement, determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipe === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX > 10 || absY > 10) {
          setIsHorizontalSwipe(absX > absY);
        }
        return;
      }

      // If it's a vertical swipe, don't interfere
      if (!isHorizontalSwipe) {
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
      setSwipeOffset(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      if (isHorizontalSwipe && swipeLeftAction && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onSwipedRight: (eventData) => {
      if (isHorizontalSwipe && swipeRightAction && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeRight();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onTouchEndOrOnMouseUp: () => {
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

  // Calculate action visibility based on swipe offset
  const showLeftAction = swipeOffset < 0 && swipeLeftAction;
  const showRightAction = swipeOffset > 0 && swipeRightAction;
  const leftActionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);
  const rightActionOpacity = Math.min(1, swipeOffset / SWIPE_THRESHOLD);

  return (
    <div ref={itemRef} data-testid="climbs-list-item" className={styles.itemWrapper}>
      <div className={styles.itemContainer}>
        {/* Left action background (revealed on swipe right) */}
        {swipeRightAction && (
          <div
            className={styles.swipeAction}
            style={{
              left: 0,
              backgroundColor: swipeRightAction.color,
              justifyContent: 'flex-start',
              paddingLeft: themeTokens.spacing[4],
              opacity: rightActionOpacity,
              visibility: showRightAction ? 'visible' : 'hidden',
            }}
          >
            {swipeRightAction.icon}
          </div>
        )}

        {/* Right action background (revealed on swipe left) */}
        {swipeLeftAction && (
          <div
            className={styles.swipeAction}
            style={{
              right: 0,
              backgroundColor: swipeLeftAction.color,
              justifyContent: 'flex-end',
              paddingRight: themeTokens.spacing[4],
              opacity: leftActionOpacity,
              visibility: showLeftAction ? 'visible' : 'hidden',
            }}
          >
            {swipeLeftAction.icon}
          </div>
        )}

        {/* Swipeable content */}
        <div
          {...swipeHandlers}
          className={styles.itemContent}
          style={{
            backgroundColor: isSelected
              ? themeTokens.semantic.selected
              : isDisabled
                ? themeTokens.neutral[100]
                : themeTokens.semantic.surface,
            opacity: isSwipeComplete ? 0 : isDisabled ? 0.6 : 1,
            cursor: isDraggable ? 'grab' : 'default',
            borderLeft: isSelected ? `3px solid ${themeTokens.colors.primary}` : undefined,
            transform: `translateX(${swipeOffset}px)`,
            transition:
              swipeOffset === 0 || isSwipeComplete
                ? `transform ${themeTokens.transitions.fast}, opacity ${themeTokens.transitions.fast}`
                : 'none',
          }}
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
