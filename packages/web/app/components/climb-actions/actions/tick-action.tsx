'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Badge, Drawer, Typography, Space } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { CheckOutlined, LoginOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useBoardProvider } from '../../board-provider/board-provider-context';
import AuthModal from '../../auth/auth-modal';
import { LogAscentDrawer } from '../../logbook/log-ascent-drawer';
import { track } from '@vercel/analytics';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';

const { Text, Paragraph } = Typography;

export function TickAction({
  climb,
  boardDetails,
  angle,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const {
    isAuthenticated,
    logbook,
  } = useBoardProvider();

  // Find ascent entries for this climb
  const filteredLogbook = useMemo(() => {
    if (!logbook || !climb) return [];
    return logbook.filter(
      (asc) => asc.climb_uuid === climb.uuid && Number(asc.angle) === angle
    );
  }, [logbook, climb, angle]);

  const hasSuccessfulAscent = filteredLogbook.some((asc) => asc.is_ascent);
  const badgeCount = filteredLogbook.length;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    track('Tick Button Clicked', {
      boardLayout: boardDetails.layout_name || '',
      existingAscentCount: badgeCount,
    });

    setDrawerVisible(true);
    onComplete?.();
  }, [boardDetails.layout_name, badgeCount, onComplete]);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const handleOpenInApp = useCallback(() => {
    const url = constructClimbInfoUrl(boardDetails, climb.uuid, angle);
    window.open(url, '_blank', 'noopener');
    closeDrawer();
  }, [boardDetails, climb.uuid, angle, closeDrawer]);

  const renderSignInPrompt = () => (
    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
      <Text strong style={{ fontSize: 16 }}>Sign in to record ticks</Text>
      <Paragraph type="secondary">
        Create a Boardsesh account to log your climbs and track your progress.
      </Paragraph>
      <Button type="primary" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} block>
        Sign In
      </Button>
      <Paragraph type="secondary">
        Or log your tick in the official app:
      </Paragraph>
      <Button icon={<AppstoreOutlined />} onClick={handleOpenInApp} block>
        Open in App
      </Button>
    </Space>
  );

  const label = 'Tick';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <CheckOutlined style={{ fontSize: iconSize }} />;
  const badgeColor = hasSuccessfulAscent ? 'cyan' : 'red';

  const drawers = (
    <>
      {isAuthenticated ? (
        <LogAscentDrawer
          open={drawerVisible}
          onClose={closeDrawer}
          currentClimb={climb}
          boardDetails={boardDetails}
        />
      ) : (
        <Drawer
          title="Sign In Required"
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          styles={{ wrapper: { height: '50%' } }}
        >
          {renderSignInPrompt()}
        </Drawer>
      )}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ticks"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );

  // Icon mode - for Card actions
  const iconElement = (
    <>
      <ActionTooltip title={label}>
        <Badge count={badgeCount} size="small" color={badgeColor} overflowCount={99} showZero={false}>
          <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
            {icon}
          </span>
        </Badge>
      </ActionTooltip>
      {drawers}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <Badge count={badgeCount} size="small" color={badgeColor} overflowCount={99} showZero={false}>
        <Button
          icon={icon}
          onClick={handleClick}
          size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
          disabled={disabled}
          className={className}
        >
          {shouldShowLabel && label}
        </Button>
      </Badge>
      {drawers}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'tick',
    label: badgeCount > 0 ? `${label} (${badgeCount})` : label,
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
      element = drawers; // Need to render drawers even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'tick',
    available: true,
  };
}

export default TickAction;
