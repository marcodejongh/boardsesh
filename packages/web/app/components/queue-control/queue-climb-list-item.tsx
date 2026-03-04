'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MuiTooltip from '@mui/material/Tooltip';
import MuiAvatar from '@mui/material/Avatar';
import MuiCheckbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import { BoardDetails, Climb } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import BluetoothIcon from './bluetooth-icon';
import { ClimbQueueItem } from './types';
import { AscentStatus } from '../climb-card/ascent-status';
import ClimbListItem, { type SwipeActionOverride } from '../climb-card/climb-list-item';
import { useColorMode } from '@/app/hooks/use-color-mode';
import { themeTokens } from '@/app/theme/theme-config';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { constructClimbInfoUrl, getContextAwareClimbViewUrl } from '@/app/lib/url-utils';

type QueueClimbListItemProps = {
  item: ClimbQueueItem;
  index: number;
  isCurrent: boolean;
  isHistory: boolean;
  boardDetails: BoardDetails;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
  removeFromQueue: (item: ClimbQueueItem) => void;
  onTickClick: (climb: Climb) => void;
  onClimbNavigate?: () => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (uuid: string) => void;
};

const QueueClimbListItem: React.FC<QueueClimbListItemProps> = ({
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
  const pathname = usePathname();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  // Navigation handlers
  const handleViewClimb = useCallback(() => {
    if (!item.climb) return;
    const climbViewUrl = getContextAwareClimbViewUrl(
      pathname,
      boardDetails,
      item.climb.angle,
      item.climb.uuid,
      item.climb.name,
    );
    onClimbNavigate?.();
    router.push(climbViewUrl);
  }, [item.climb, pathname, boardDetails, onClimbNavigate, router]);

  const handleOpenInApp = useCallback(() => {
    if (!item.climb) return;
    const url = constructClimbInfoUrl(boardDetails, item.climb.uuid);
    window.open(url, '_blank', 'noopener');
  }, [item.climb, boardDetails]);

  // Swipe action overrides for ClimbListItem
  const swipeLeftAction: SwipeActionOverride = useMemo(
    () => ({
      icon: <CheckOutlined style={{ color: 'white', fontSize: 20 }} />,
      color: themeTokens.colors.success,
      onAction: () => {
        if (item.climb) onTickClick(item.climb);
      },
    }),
    [item.climb, onTickClick],
  );

  const swipeRightAction: SwipeActionOverride = useMemo(
    () => ({
      icon: <DeleteOutlined style={{ color: 'white', fontSize: 20 }} />,
      color: themeTokens.colors.error,
      onAction: () => removeFromQueue(item),
    }),
    [item, removeFromQueue],
  );

  // Background color based on current/history state
  const backgroundColor = useMemo(() => {
    if (isCurrent) {
      return getGradeTintColor(item.climb?.difficulty, 'light', isDark) ?? 'var(--semantic-selected)';
    }
    if (isHistory) return 'var(--neutral-100)';
    return 'var(--semantic-surface)';
  }, [isCurrent, isHistory, item.climb?.difficulty, isDark]);

  // "Added by" avatar slot
  const afterTitleSlot = useMemo(() => {
    const avatarStyle = { width: 24, height: 24 };
    const avatarBluetoothStyle = { width: 24, height: 24, backgroundColor: 'transparent' };

    if (item.addedByUser) {
      return (
        <MuiTooltip title={item.addedByUser.username}>
          <MuiAvatar sx={avatarStyle} src={item.addedByUser.avatarUrl}>
            <PersonOutlined />
          </MuiAvatar>
        </MuiTooltip>
      );
    }
    return (
      <MuiTooltip title="Added via Bluetooth">
        <MuiAvatar sx={avatarBluetoothStyle}>
          <BluetoothIcon style={{ color: 'var(--neutral-400)' }} />
        </MuiAvatar>
      </MuiTooltip>
    );
  }, [item.addedByUser]);

  // ClimbTitle props for queue display
  const titleProps = useMemo(
    () => ({
      showAngle: true as const,
      centered: true as const,
      nameAddon: <AscentStatus climbUuid={item.climb?.uuid} />,
    }),
    [item.climb?.uuid],
  );

  // Menu slot
  const menuSlot = useMemo(() => {
    if (isEditMode) return null;

    return (
      <div style={{ flexShrink: 0 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchorEl(e.currentTarget);
          }}
          style={{ color: 'var(--neutral-400)' }}
        >
          <MoreVertOutlined />
        </IconButton>
      </div>
    );
  }, [isEditMode]);

  // onSelect handler — double-tap sets current climb
  const handleSelect = useCallback(() => {
    if (!isEditMode) {
      setCurrentClimbQueueItem(item);
    }
  }, [isEditMode, setCurrentClimbQueueItem, item]);

  // Drag-and-drop setup
  useEffect(() => {
    if (isEditMode) return;
    const element = itemRef.current;
    if (!element) return;

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
            { element, input, allowedEdges: ['top', 'bottom'] },
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
  }, [index, item.uuid, isEditMode]);

  const editModeContainerStyle = useMemo(
    () => ({
      display: 'flex' as const,
      alignItems: 'center' as const,
    }),
    [],
  );

  const editModeContentStyle = useMemo(
    () => ({
      flex: 1,
      minWidth: 0,
    }),
    [],
  );

  const content = (
    <ClimbListItem
      climb={item.climb}
      boardDetails={boardDetails}
      selected={isCurrent}
      disableSwipe={isEditMode}
      onSelect={isEditMode ? () => onToggleSelect?.(item.uuid) : handleSelect}
      swipeLeftAction={swipeLeftAction}
      swipeRightAction={swipeRightAction}
      afterTitleSlot={afterTitleSlot}
      menuSlot={menuSlot}
      titleProps={titleProps}
      backgroundColor={backgroundColor}
      contentOpacity={isHistory ? 0.6 : 1}
    />
  );

  return (
    <div ref={itemRef} data-testid="queue-item" style={isEditMode ? undefined : { cursor: 'grab' }}>
      {isEditMode ? (
        <div
          style={editModeContainerStyle}
          onClick={() => onToggleSelect?.(item.uuid)}
        >
          <MuiCheckbox
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(item.uuid)}
          />
          <div style={editModeContentStyle}>
            {content}
          </div>
        </div>
      ) : (
        content
      )}
      {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}

      {/* Context menu (rendered outside to avoid layout issues) */}
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
  );
};

export default React.memo(QueueClimbListItem);
