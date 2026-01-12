'use client';

import React, { useMemo } from 'react';
import { Space, Dropdown, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  ClimbActionsProps,
  ClimbActionType,
  ClimbActionResult,
  ClimbActionProps,
  DEFAULT_ACTION_ORDER,
} from './types';
import {
  ViewDetailsAction,
  ForkAction,
  FavoriteAction,
  QueueAction,
  TickAction,
  OpenInAppAction,
  MirrorAction,
  ShareAction,
  AddToListAction,
  PlaylistAction,
} from './actions';

// Extended props for OpenInAppAction
interface OpenInAppActionProps extends ClimbActionProps {
  auroraAppUrl?: string;
}

// Map action types to their handler functions
const ACTION_FUNCTIONS: Record<
  ClimbActionType,
  (props: ClimbActionProps | OpenInAppActionProps) => ClimbActionResult
> = {
  viewDetails: ViewDetailsAction,
  fork: ForkAction,
  favorite: FavoriteAction,
  queue: QueueAction,
  tick: TickAction,
  openInApp: OpenInAppAction,
  mirror: MirrorAction,
  share: ShareAction,
  addToList: AddToListAction,
  playlist: PlaylistAction,
};

/**
 * Helper function to create a renderer component for an action type.
 * This ensures hooks are called at the component level (valid), not inside useMemo (invalid).
 */
function createActionRenderer(
  actionFn: (props: ClimbActionProps | OpenInAppActionProps) => ClimbActionResult
): React.FC<ClimbActionProps | OpenInAppActionProps> {
  return function ActionRenderer(props) {
    // Call the action function at component level - hooks inside are now valid
    const result = actionFn(props);
    if (!result.available) return null;
    return <React.Fragment key={result.key}>{result.element}</React.Fragment>;
  };
}

// Create stable renderer components for each action type
// These are created once at module level, so component identity is stable
const ACTION_RENDERERS: Record<ClimbActionType, React.FC<ClimbActionProps | OpenInAppActionProps>> = {
  viewDetails: createActionRenderer(ViewDetailsAction),
  fork: createActionRenderer(ForkAction),
  favorite: createActionRenderer(FavoriteAction),
  queue: createActionRenderer(QueueAction),
  tick: createActionRenderer(TickAction),
  openInApp: createActionRenderer(OpenInAppAction),
  mirror: createActionRenderer(MirrorAction),
  share: createActionRenderer(ShareAction),
  addToList: createActionRenderer(AddToListAction),
  playlist: createActionRenderer(PlaylistAction),
};

export function ClimbActions({
  climb,
  boardDetails,
  angle,
  viewMode,
  include,
  exclude = [],
  size = 'default',
  className,
  onActionComplete,
  auroraAppUrl,
}: ClimbActionsProps) {
  // Determine which actions to show
  const actionsToShow = useMemo(() => {
    let actions = include || DEFAULT_ACTION_ORDER;
    // Filter out excluded actions
    actions = actions.filter((action) => !exclude.includes(action));
    return actions;
  }, [include, exclude]);

  // Common props for all action components (memoized for stability)
  const commonProps = useMemo(
    () => ({
      climb,
      boardDetails,
      angle,
      viewMode,
      size,
      auroraAppUrl,
    }),
    [climb, boardDetails, angle, viewMode, size, auroraAppUrl]
  );

  // Icon mode - render each action as a component
  if (viewMode === 'icon') {
    return (
      <>
        {actionsToShow.map((actionType) => {
          const Renderer = ACTION_RENDERERS[actionType];
          if (!Renderer) return null;
          return (
            <Renderer
              key={actionType}
              {...commonProps}
              onComplete={onActionComplete ? () => onActionComplete(actionType) : undefined}
            />
          );
        })}
      </>
    );
  }

  // Button mode - render each action as a component inside Space
  if (viewMode === 'button' || viewMode === 'compact') {
    return (
      <Space wrap className={className}>
        {actionsToShow.map((actionType) => {
          const Renderer = ACTION_RENDERERS[actionType];
          if (!Renderer) return null;
          return (
            <Renderer
              key={actionType}
              {...commonProps}
              onComplete={onActionComplete ? () => onActionComplete(actionType) : undefined}
            />
          );
        })}
      </Space>
    );
  }

  // Dropdown mode - use DropdownActions component for proper hooks handling
  if (viewMode === 'dropdown') {
    return (
      <DropdownActions
        actionsToShow={actionsToShow}
        commonProps={commonProps}
        className={className}
        onActionComplete={onActionComplete}
      />
    );
  }

  return null;
}

/**
 * Separate component for dropdown mode to properly handle hooks.
 * Each action is rendered as its own component to ensure hooks are called correctly.
 */
function DropdownActions({
  actionsToShow,
  commonProps,
  className,
  onActionComplete,
}: {
  actionsToShow: ClimbActionType[];
  commonProps: Omit<ClimbActionProps, 'onComplete'>;
  className?: string;
  onActionComplete?: (actionType: ClimbActionType) => void;
}) {
  // Collect menu items from all actions
  const [menuItems, setMenuItems] = React.useState<MenuProps['items']>([]);

  // Create a stable callback for collecting menu items
  const menuItemsRef = React.useRef<Map<string, ClimbActionResult['menuItem']>>(new Map());

  const handleMenuItem = React.useCallback((actionType: ClimbActionType, item: ClimbActionResult['menuItem']) => {
    menuItemsRef.current.set(actionType, item);
    // Update menu items state (collect all items in order)
    const items = actionsToShow
      .map((type) => menuItemsRef.current.get(type))
      .filter((item): item is ClimbActionResult['menuItem'] => item !== undefined);
    setMenuItems(items);
  }, [actionsToShow]);

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button icon={<MoreOutlined />} className={className} />
      </Dropdown>
      {/* Render action components to get menu items and render any needed DOM elements */}
      {actionsToShow.map((actionType) => (
        <DropdownActionRenderer
          key={actionType}
          actionType={actionType}
          commonProps={commonProps}
          onActionComplete={onActionComplete}
          onMenuItem={(item) => handleMenuItem(actionType, item)}
        />
      ))}
    </>
  );
}

/**
 * Individual action renderer for dropdown mode.
 * This component calls the action function at component level, making hooks valid.
 */
function DropdownActionRenderer({
  actionType,
  commonProps,
  onActionComplete,
  onMenuItem,
}: {
  actionType: ClimbActionType;
  commonProps: Omit<ClimbActionProps, 'onComplete'>;
  onActionComplete?: (actionType: ClimbActionType) => void;
  onMenuItem: (item: ClimbActionResult['menuItem']) => void;
}) {
  const actionFn = ACTION_FUNCTIONS[actionType];
  // Track if we've reported the menu item to prevent infinite loops
  const hasReportedRef = React.useRef(false);
  const onMenuItemRef = React.useRef(onMenuItem);
  onMenuItemRef.current = onMenuItem;

  // Call action function at component level - hooks are valid here
  // Note: actionFn must be called unconditionally to maintain hooks order
  const result = actionFn({
    ...commonProps,
    viewMode: 'dropdown',
    onComplete: onActionComplete ? () => onActionComplete(actionType) : undefined,
  });

  // Report menu item to parent only once on mount
  React.useEffect(() => {
    if (result.available && !hasReportedRef.current) {
      hasReportedRef.current = true;
      onMenuItemRef.current(result.menuItem);
    }
  }, [result.available]); // Only depend on availability, not menuItem object

  // Render any elements needed in DOM (modals, drawers, etc.)
  if (!result.available || !result.element) return null;
  return <>{result.element}</>;
}

export default ClimbActions;
