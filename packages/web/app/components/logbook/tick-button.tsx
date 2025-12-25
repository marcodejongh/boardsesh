import React, { useState } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Badge, Drawer, Typography, Space } from 'antd';
import { CheckOutlined, SettingOutlined, LoginOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { LogbookDrawer } from './logbook-drawer';
import { useRouter } from 'next/navigation';
import AuthModal from '../auth/auth-modal';

const { Text, Paragraph } = Typography;

interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const TickButton: React.FC<TickButtonProps> = ({ currentClimb, angle, boardDetails }) => {
  const router = useRouter();
  const { logbook, isAuthenticated, hasAuroraCredentials, user_id } = useBoardProvider();
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

  const boardName = boardDetails.board_name;
  const boardNameCapitalized = boardName.charAt(0).toUpperCase() + boardName.slice(1);
  const userId = String(user_id || '');

  const renderDrawerContent = () => {
    if (!isAuthenticated) {
      return (
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
          <Text strong style={{ fontSize: 16 }}>Sign in to record ascents</Text>
          <Paragraph type="secondary">
            Create a Boardsesh account to log your climbs and track your progress.
          </Paragraph>
          <Button type="primary" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} block>
            Sign In
          </Button>
        </Space>
      );
    }

    if (!hasAuroraCredentials) {
      return (
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
          <Text strong style={{ fontSize: 16 }}>Link your {boardNameCapitalized} account</Text>
          <Paragraph type="secondary">
            Link your {boardNameCapitalized} Board account in Settings to record ascents and sync your logbook.
          </Paragraph>
          <Button icon={<SettingOutlined />} onClick={() => router.push('/settings')} block>
            Go to Settings
          </Button>
        </Space>
      );
    }

    return null; // LogbookDrawer will handle the rest
  };

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

      {isAuthenticated && hasAuroraCredentials ? (
        <LogbookDrawer
          drawerVisible={drawerVisible}
          closeDrawer={closeDrawer}
          currentClimb={currentClimb}
          boardDetails={boardDetails}
          boardName={boardName}
          userId={userId}
        />
      ) : (
        <Drawer
          title={!isAuthenticated ? "Sign In Required" : "Link Account Required"}
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          styles={{ wrapper: { height: '50%' } }}
        >
          {renderDrawerContent()}
        </Drawer>
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ascents"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );
};
