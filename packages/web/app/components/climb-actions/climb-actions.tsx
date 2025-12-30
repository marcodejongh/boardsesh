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
import styles from './climb-actions.module.css';

// Extended props for OpenInAppAction
interface OpenInAppActionProps extends ClimbActionProps {
  auroraAppUrl?: string;
}

// Map action types to their handler functions
const ACTION_COMPONENTS: Record<
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

  // Common props for all action components
  const commonProps = useMemo(
    () => ({
      climb,
      boardDetails,
      angle,
      viewMode,
      size,
      onComplete: onActionComplete ? () => onActionComplete : undefined,
      auroraAppUrl,
    }),
    [climb, boardDetails, angle, viewMode, size, onActionComplete, auroraAppUrl]
  );

  // Get action results
  const actionResults = useMemo(() => {
    return actionsToShow
      .map((actionType) => {
        const ActionComponent = ACTION_COMPONENTS[actionType];
        if (!ActionComponent) return null;

        const result = ActionComponent({
          ...commonProps,
          onComplete: onActionComplete ? () => onActionComplete(actionType) : undefined,
        });

        return result;
      })
      .filter((result): result is ClimbActionResult => result !== null && result.available);
  }, [actionsToShow, commonProps, onActionComplete]);

  // Icon mode - return array of elements for Ant Design Card actions
  if (viewMode === 'icon') {
    const elements = actionResults
      .map((result) => (
        <React.Fragment key={result.key}>{result.element}</React.Fragment>
      ))
      .filter(Boolean);

    return <>{elements}</>;
  }

  // Button mode - return Space with buttons
  if (viewMode === 'button' || viewMode === 'compact') {
    return (
      <Space wrap className={className}>
        {actionResults.map((result) => (
          <React.Fragment key={result.key}>{result.element}</React.Fragment>
        ))}
      </Space>
    );
  }

  // Dropdown mode - return Dropdown component
  if (viewMode === 'dropdown') {
    const menuItems: MenuProps['items'] = actionResults.map((result) => result.menuItem);

    // Also render any elements that need to be in the DOM (modals, drawers)
    const elementsToRender = actionResults
      .filter((result) => result.element !== null)
      .map((result) => (
        <React.Fragment key={result.key}>{result.element}</React.Fragment>
      ));

    return (
      <>
        <Dropdown
          menu={{ items: menuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button icon={<MoreOutlined />} className={className} />
        </Dropdown>
        {elementsToRender}
      </>
    );
  }

  return null;
}

/**
 * Helper function to get actions as an array for Ant Design Card actions prop
 * Usage: <Card actions={ClimbActions.asCardActions({ climb, boardDetails, angle })} />
 */
ClimbActions.asCardActions = function asCardActions(
  props: Omit<ClimbActionsProps, 'viewMode'>
): React.ReactNode[] {
  const { climb, boardDetails, angle, include, exclude = [], size, onActionComplete, auroraAppUrl } = props;

  // Determine which actions to show
  let actions = include || DEFAULT_ACTION_ORDER;
  actions = actions.filter((action) => !exclude.includes(action));

  const commonProps = {
    climb,
    boardDetails,
    angle,
    viewMode: 'icon' as const,
    size,
    auroraAppUrl,
  };

  const results: React.ReactNode[] = [];

  for (const actionType of actions) {
    const ActionComponent = ACTION_COMPONENTS[actionType];
    if (!ActionComponent) continue;

    const result = ActionComponent({
      ...commonProps,
      onComplete: onActionComplete ? () => onActionComplete(actionType) : undefined,
    });

    if (result && result.available && result.element) {
      results.push(
        <React.Fragment key={result.key}>{result.element}</React.Fragment>
      );
    }
  }

  return results;
};

/**
 * Helper function to get actions with expanded content for Ant Design Card
 * Returns both the action icons and any expanded content that should render inline
 * Usage: const { actions, expandedContent } = ClimbActions.asCardActionsWithContent({ climb, boardDetails, angle });
 */
ClimbActions.asCardActionsWithContent = function asCardActionsWithContent(
  props: Omit<ClimbActionsProps, 'viewMode'>
): { actions: React.ReactNode[]; expandedContent: React.ReactNode } {
  const { climb, boardDetails, angle, include, exclude = [], size, onActionComplete, auroraAppUrl } = props;

  // Determine which actions to show
  let actions = include || DEFAULT_ACTION_ORDER;
  actions = actions.filter((action) => !exclude.includes(action));

  const commonProps = {
    climb,
    boardDetails,
    angle,
    viewMode: 'icon' as const,
    size,
    auroraAppUrl,
  };

  const actionElements: React.ReactNode[] = [];
  const expandedElements: React.ReactNode[] = [];

  for (const actionType of actions) {
    const ActionComponent = ACTION_COMPONENTS[actionType];
    if (!ActionComponent) continue;

    const result = ActionComponent({
      ...commonProps,
      onComplete: onActionComplete ? () => onActionComplete(actionType) : undefined,
    });

    if (result && result.available) {
      if (result.element) {
        actionElements.push(
          <React.Fragment key={result.key}>{result.element}</React.Fragment>
        );
      }
      if (result.expandedContent) {
        expandedElements.push(
          <React.Fragment key={`expanded:${result.key}`}>{result.expandedContent}</React.Fragment>
        );
      }
    }
  }

  return {
    actions: actionElements,
    expandedContent: expandedElements.length > 0 ? <>{expandedElements}</> : null,
  };
};

export default ClimbActions;
