import React, { useState, useMemo } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProviderOptional } from '../board-provider/board-provider-context';
import { Button, Badge, Typography, Space } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { CheckOutlined, LoginOutlined, AppstoreOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { LogAscentDrawer } from './log-ascent-drawer';
import AuthModal from '../auth/auth-modal';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';

const { Text, Paragraph } = Typography;

interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  buttonType?: 'default' | 'text';
}

export const TickButton: React.FC<TickButtonProps> = ({ currentClimb, angle, boardDetails, buttonType = 'default' }) => {
  const boardContext = useBoardProviderOptional();
  const logbook = boardContext?.logbook ?? [];
  const isAuthenticated = boardContext?.isAuthenticated ?? false;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const showDrawer = () => {
    setDrawerVisible(true);
    track('Tick Button Clicked', {
      boardLayout: boardDetails.layout_name || '',
      existingAscentCount: badgeCount,
    });
  };
  const closeDrawer = () => setDrawerVisible(false);

  const handleOpenInApp = () => {
    if (!currentClimb) return;
    const url = constructClimbInfoUrl(boardDetails, currentClimb.uuid, angle);
    window.open(url, '_blank', 'noopener');
    closeDrawer();
  };

  const filteredLogbook = useMemo(
    () => logbook.filter((asc) => asc.climb_uuid === currentClimb?.uuid && Number(asc.angle) === angle),
    [logbook, currentClimb?.uuid, angle],
  );
  const hasSuccessfulAscent = filteredLogbook.some((asc) => asc.is_ascent);
  const badgeCount = filteredLogbook.length;

  return (
    <>
      <Badge
        count={badgeCount > 0 ? badgeCount : 0}
        overflowCount={100}
        showZero={false}
        color={hasSuccessfulAscent ? 'cyan' : 'red'}
      >
        <Button id="button-tick" type={buttonType} icon={<CheckOutlined />} onClick={showDrawer} />
      </Badge>

      {isAuthenticated ? (
        <LogAscentDrawer
          open={drawerVisible}
          onClose={closeDrawer}
          currentClimb={currentClimb}
          boardDetails={boardDetails}
        />
      ) : (
        <SwipeableDrawer
          title="Sign In Required"
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          swipeRegion="body"
          styles={{ wrapper: { height: '50%' } }}
        >
          <Space orientation="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
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
        </SwipeableDrawer>
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ticks"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );
};
