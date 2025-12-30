'use client';

import React, { useState, useCallback } from 'react';
import { Button, Tooltip, message } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import AuthModal from '../../auth/auth-modal';

export function AddToListAction({
  climb,
  boardDetails,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    track('Add to List Clicked', {
      boardName: boardDetails.board_name,
      climbUuid: climb.uuid,
    });

    // TODO: Implement list functionality
    message.info('Add to list coming soon!');
    onComplete?.();
  }, [isAuthenticated, boardDetails.board_name, climb.uuid, onComplete]);

  const label = 'Add to List';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <UnorderedListOutlined style={{ fontSize: iconSize }} />;

  const authModalElement = (
    <AuthModal
      open={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      onSuccess={() => setShowAuthModal(false)}
      title="Sign in to create lists"
      description="Sign in to save climbs to your personal lists."
    />
  );

  // Icon mode - for Card actions
  const iconElement = (
    <>
      <Tooltip title={label}>
        <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
          {icon}
        </span>
      </Tooltip>
      {authModalElement}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <Button
        icon={icon}
        onClick={handleClick}
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </Button>
      {authModalElement}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'addToList',
    label,
    icon,
    onClick: () => handleClick(),
  };

  let element: React.ReactNode;
  switch (viewMode) {
    case 'icon':
      element = iconElement;
      break;
    case 'button':
    case 'compact':
      element = buttonElement;
      break;
    case 'dropdown':
      element = authModalElement; // Need to render auth modal even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'addToList',
    available: true,
  };
}

export default AddToListAction;
