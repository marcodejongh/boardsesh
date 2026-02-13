'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MuiTooltip from '@mui/material/Tooltip';
import MuiAvatar from '@mui/material/Avatar';
import MuiCheckbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import BluetoothIcon from './bluetooth-icon';
import { BoardDetails, ClimbUuid, Climb } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { useSwipeActions } from '@/app/hooks/use-swipe-actions';
import { ClimbQueueItem } from './types';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { useOptionalBoardProvider } from '../board-provider/board-provider-context';
import { themeTokens } from '@/app/theme/theme-config';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { useColorMode } from '@/app/hooks/use-color-mode';
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
  const boardProvider = useOptionalBoardProvider();
  const logbook = boardProvider?.logbook ?? [];
  const boardName = boardProvider?.boardName ?? 'kilter';

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
            <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
          </div>
        ) : null}
        {/* Mirrored ascent icon */}
        {hasSuccessfulMirroredAscent ? (
          <div className={styles.ascentIconMirrored}>
            <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
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
    <CheckOutlined style={{ color: 'var(--neutral-400)', fontSize }} />
  ) : (
    <CloseOutlined style={{ color: themeTokens.colors.error, fontSize }} />
  );
};

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
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
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
    removeFromQueue(item);
  }, [item, removeFromQueue]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = tick (open tick drawer)
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

  const { swipeHandlers, isSwipeComplete, contentRef, leftActionRef, rightActionRef } = useSwipeActions({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    disabled: isEditMode,
  });

  // Memoize style objects to prevent recreation on every render
  const borderBottomStyle = useMemo(
    () => ({ borderBottom: `1px solid var(--neutral-200)` }),
    [],
  );

  const leftActionStyle = useMemo(
    () => ({
      width: MAX_SWIPE,
      backgroundColor: themeTokens.colors.success,
      paddingLeft: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [],
  );

  const rightActionStyle = useMemo(
    () => ({
      width: MAX_SWIPE,
      backgroundColor: themeTokens.colors.error,
      paddingRight: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [],
  );

  const swipeableContentStyle = useMemo(
    () => ({
      padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[2]}px`,
      backgroundColor: isCurrent
        ? (getGradeTintColor(item.climb?.difficulty, 'light', isDark) ?? 'var(--semantic-selected)')
        : isHistory
          ? 'var(--neutral-100)'
          : 'var(--semantic-surface)',
      opacity: isSwipeComplete ? 0 : isHistory ? 0.6 : 1,
      cursor: isEditMode ? 'pointer' : undefined,
    }),
    [isCurrent, isHistory, isSwipeComplete, isEditMode, item.climb?.difficulty],
  );

  const avatarStyle = useMemo(
    () => ({ width: 24, height: 24 }),
    [],
  );

  const avatarBluetoothStyle = useMemo(
    () => ({ width: 24, height: 24, backgroundColor: 'transparent' }),
    [],
  );

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

  return (
    <div ref={itemRef} data-testid="queue-item">
      <div
        className={styles.itemWrapper}
        style={borderBottomStyle}
      >
        {/* Left action background (tick - revealed on swipe right) */}
        <div
          ref={leftActionRef}
          className={styles.leftAction}
          style={leftActionStyle}
        >
          <CheckOutlined className={styles.actionIcon} />
        </div>

        {/* Right action background (delete - revealed on swipe left) */}
        <div
          ref={rightActionRef}
          className={styles.rightAction}
          style={rightActionStyle}
        >
          <DeleteOutlined className={styles.actionIcon} />
        </div>

        {/* Swipeable content */}
        <div
          {...(isEditMode ? {} : swipeHandlers)}
          ref={isEditMode ? undefined : (node: HTMLDivElement | null) => {
            doubleTapRef(node);
            swipeHandlers.ref(node);
            contentRef(node);
          }}
          className={styles.swipeableContent}
          style={swipeableContentStyle}
          onDoubleClick={isEditMode ? undefined : handleDoubleTap}
          onClick={isEditMode ? () => onToggleSelect?.(item.uuid) : undefined}
        >
          <div className={styles.contentRow}>
            {isEditMode && (
              <div className={styles.colCheckbox}>
                <MuiCheckbox
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect?.(item.uuid)}
                />
              </div>
            )}
            <div className={isEditMode ? styles.colThumbnailEdit : styles.colThumbnail}>
              <ClimbThumbnail
                boardDetails={boardDetails}
                currentClimb={item.climb}
              />
            </div>
            <div className={isEditMode ? styles.colTitleEdit : styles.colTitle}>
              <ClimbTitle
                climb={item.climb}
                showAngle
                centered
                nameAddon={<AscentStatus climbUuid={item.climb?.uuid} />}
              />
            </div>
            <div className={styles.colAvatar}>
              {item.addedByUser ? (
                <MuiTooltip title={item.addedByUser.username}>
                  <MuiAvatar sx={avatarStyle} src={item.addedByUser.avatarUrl}>
                    <PersonOutlined />
                  </MuiAvatar>
                </MuiTooltip>
              ) : (
                <MuiTooltip title="Added via Bluetooth">
                  <MuiAvatar sx={avatarBluetoothStyle}>
                    <BluetoothIcon style={{ color: 'var(--neutral-400)' }} />
                  </MuiAvatar>
                </MuiTooltip>
              )}
            </div>
            {!isEditMode && (
              <div className={styles.colMenu}>
                <IconButton onClick={(e) => setMenuAnchorEl(e.currentTarget)}><MoreVertOutlined /></IconButton>
                {menuAnchorEl && (
                  <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={() => setMenuAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <MenuItem onClick={() => { setMenuAnchorEl(null); handleViewClimb(); }}>
                      <ListItemIcon><InfoOutlined /></ListItemIcon>
                      <ListItemText>View Climb</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { setMenuAnchorEl(null); if (item.climb) onTickClick(item.climb); }}>
                      <ListItemIcon><CheckOutlined /></ListItemIcon>
                      <ListItemText>Tick Climb</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { setMenuAnchorEl(null); handleOpenInApp(); }}>
                      <ListItemIcon><AppsOutlined /></ListItemIcon>
                      <ListItemText>Open in App</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { setMenuAnchorEl(null); removeFromQueue(item); }} sx={{ color: 'error.main' }}>
                      <ListItemIcon><DeleteOutlined color="error" /></ListItemIcon>
                      <ListItemText>Remove from Queue</ListItemText>
                    </MenuItem>
                  </Menu>
                )}
              </div>
            )}
          </div>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </div>
    </div>
  );
};

export default React.memo(QueueListItem);
