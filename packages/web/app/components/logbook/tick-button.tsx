import React, { useState } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Badge, Drawer, Typography, Space } from 'antd';
import { CheckOutlined, LoginOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { LogAscentDrawer } from './log-ascent-drawer';
import AuthModal from '../auth/auth-modal';

const { Text, Paragraph } = Typography;

interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const TickButton: React.FC<TickButtonProps> = ({ currentClimb, angle, boardDetails }) => {
  const { logbook, isAuthenticated } = useBoardProvider();
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

  const filteredLogbook = logbook.filter((asc) => asc.climb_uuid === currentClimb?.uuid && Number(asc.angle) === angle);
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
        <Button id="button-tick" type="default" icon={<CheckOutlined />} onClick={showDrawer} />
      </Badge>

      {isAuthenticated ? (
        <LogAscentDrawer
          open={drawerVisible}
          onClose={closeDrawer}
          currentClimb={currentClimb}
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
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
            <Text strong style={{ fontSize: 16 }}>Sign in to record ticks</Text>
            <Paragraph type="secondary">
              Create a Boardsesh account to log your climbs and track your progress.
            </Paragraph>
            <Button type="primary" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} block>
              Sign In
            </Button>
          </Space>
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
};
