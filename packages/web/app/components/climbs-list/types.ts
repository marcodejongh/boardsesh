import { ReactNode } from 'react';
import { BoardDetails } from '@/app/lib/types';
import { LitUpHoldsMap } from '../board-renderer/types';
import { MenuProps } from 'antd';

/**
 * Base interface for items that can be displayed in a ClimbsList
 */
export interface ClimbsListItem {
  uuid: string;
}

/**
 * Swipe action configuration
 */
export interface SwipeAction {
  icon: ReactNode;
  color: string;
  onSwipe: () => void;
}

/**
 * Props for rendering item content
 */
export interface ClimbsListItemContentProps<T extends ClimbsListItem> {
  item: T;
  boardDetails: BoardDetails;
}

/**
 * Props for the ClimbsListItem component
 */
export interface ClimbsListItemProps<T extends ClimbsListItem> {
  item: T;
  index: number;
  boardDetails: BoardDetails;
  // Content rendering
  litUpHoldsMap: LitUpHoldsMap;
  mirrored?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  // Styling
  isSelected?: boolean;
  isDisabled?: boolean;
  // Actions
  menuItems?: MenuProps['items'];
  swipeLeftAction?: SwipeAction;
  swipeRightAction?: SwipeAction;
  onDoubleClick?: () => void;
  // Drag and drop
  draggable?: boolean;
}

/**
 * Props for the ClimbsList component
 */
export interface ClimbsListProps<T extends ClimbsListItem> {
  items: T[];
  boardDetails: BoardDetails;
  loading?: boolean;
  emptyText?: ReactNode;
  // Render props
  renderItem: (item: T, index: number) => ClimbsListItemProps<T>;
  // Reordering
  onReorder?: (items: T[]) => void;
}
