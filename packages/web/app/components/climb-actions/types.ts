import { Climb, BoardDetails } from '@/app/lib/types';
import type { MenuItemType } from 'antd/es/menu/interface';

/**
 * Available action types for climbs
 */
export type ClimbActionType =
  | 'viewDetails'
  | 'fork'
  | 'favorite'
  | 'setActive'
  | 'queue'
  | 'tick'
  | 'openInApp'
  | 'mirror'
  | 'share'
  | 'addToList'
  | 'playlist';

/**
 * View modes for rendering climb actions
 * - icon: Icon-only display (for Ant Design Card actions prop)
 * - button: Full buttons with labels
 * - dropdown: Menu items for Dropdown component
 * - compact: Small buttons with labels on hover
 */
export type ClimbActionsViewMode = 'icon' | 'button' | 'dropdown' | 'compact' | 'list';

/**
 * Size options for action buttons/icons
 */
export type ClimbActionSize = 'small' | 'default' | 'large';

/**
 * Base props required for all action components
 */
export interface ClimbActionBaseProps {
  climb: Climb;
  boardDetails: BoardDetails;
  angle: number;
}

/**
 * Props for individual action components
 */
export interface ClimbActionProps extends ClimbActionBaseProps {
  viewMode: ClimbActionsViewMode;
  size?: ClimbActionSize;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  onComplete?: () => void;
}

/**
 * Props for the high-level ClimbActions component
 */
export interface ClimbActionsProps extends ClimbActionBaseProps {
  /** View mode for rendering actions */
  viewMode: ClimbActionsViewMode;
  /** Show only these actions (if not provided, shows all available) */
  include?: ClimbActionType[];
  /** Hide these actions */
  exclude?: ClimbActionType[];
  /** Size of buttons/icons */
  size?: ClimbActionSize;
  /** Additional CSS class */
  className?: string;
  /** Callback when any action is performed */
  onActionComplete?: (action: ClimbActionType) => void;
  /** Aurora app URL for Open in App action */
  auroraAppUrl?: string;
}

/**
 * Menu item type for dropdown mode
 */
export type ClimbActionMenuItem = MenuItemType;

/**
 * Result from individual action components for different render modes
 */
export interface ClimbActionResult {
  /** The rendered element (for icon/button modes) */
  element: React.ReactNode;
  /** Menu item config (for dropdown mode) */
  menuItem: ClimbActionMenuItem;
  /** Unique key for React lists */
  key: ClimbActionType;
  /** Whether the action is currently available */
  available: boolean;
  /** Optional expanded content to render inline (e.g., playlist selector) */
  expandedContent?: React.ReactNode;
}

/**
 * Return type for useClimbActions hook
 */
export interface UseClimbActionsReturn {
  // Action handlers
  handleViewDetails: () => void;
  handleFork: () => void;
  handleFavorite: () => Promise<void>;
  handleQueue: () => void;
  handleTick: () => void;
  handleOpenInApp: () => void;
  handleMirror: () => void;
  handleShare: () => Promise<void>;
  handleAddToList: () => void;

  // State
  isFavorited: boolean;
  isFavoriteLoading: boolean;
  isAuthenticated: boolean;
  recentlyAddedToQueue: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;

  // Computed availability
  canFork: boolean;
  canMirror: boolean;

  // URLs
  viewDetailsUrl: string;
  forkUrl: string | null;
  openInAppUrl: string;
}

/**
 * Default order of actions when displayed
 */
export const DEFAULT_ACTION_ORDER: ClimbActionType[] = [
  'viewDetails',
  'fork',
  'favorite',
  'setActive',
  'queue',
  'tick',
  'share',
  'addToList',
  'playlist',
  'openInApp',
  'mirror',
];

/**
 * Actions that require authentication
 */
export const AUTH_REQUIRED_ACTIONS: ClimbActionType[] = ['favorite', 'addToList', 'playlist'];

/**
 * Actions that require Aurora credentials
 */
export const AURORA_CREDENTIALS_REQUIRED_ACTIONS: ClimbActionType[] = ['tick'];
