import React, { useState } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Badge, Form, Input, Drawer } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { LogbookDrawer } from './logbook-drawer';

interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

const LoginForm = ({
  onLogin,
  isLoggingIn,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoggingIn: boolean;
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <Form layout="vertical">
      <Form.Item label="Username" required tooltip="Your board account username">
        <Input placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Form.Item>

      <Form.Item label="Password" required tooltip="Your board account password">
        <Input.Password placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Form.Item>

      <Button type="primary" block loading={isLoggingIn} onClick={handleSubmit}>
        {isLoggingIn ? 'Logging in...' : 'Login to Record Ascent'}
      </Button>
    </Form>
  );
};

export const TickButton: React.FC<TickButtonProps> = ({ currentClimb, angle, boardDetails }) => {
  const { logbook, login, isAuthenticated, user_id } = useBoardProvider();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const showDrawer = () => {
    setDrawerVisible(true);
    track('Tick Button Clicked', {
      climbUuid: currentClimb?.uuid || '',
      climbName: currentClimb?.name || '',
      isAuthenticated,
      existingAscentCount: badgeCount,
      hasSuccessfulAscent
    });
  };
  const closeDrawer = () => setDrawerVisible(false);

  const handleLogin = async (username: string, password: string) => {
    setIsLoggingIn(true);
    try {
      await login(boardDetails.board_name, username, password);
      track('User Login', {
        board: boardDetails.board_name,
        success: true
      });
    } catch (error) {
      console.error('Login failed:', error);
      track('User Login', {
        board: boardDetails.board_name,
        success: false
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const filteredLogbook = logbook.filter((asc) => asc.climb_uuid === currentClimb?.uuid && Number(asc.angle) === angle);
  const hasSuccessfulAscent = filteredLogbook.some((asc) => asc.is_ascent);
  const badgeCount = filteredLogbook.length;

  const boardName = boardDetails.board_name;
  const userId = String(user_id || '');

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
        <LogbookDrawer
          drawerVisible={drawerVisible}
          closeDrawer={closeDrawer}
          currentClimb={currentClimb}
          boardDetails={boardDetails}
          boardName={boardName}
          userId={userId}
        />
      ) : (
        <Drawer title="Login Required" placement="bottom" onClose={closeDrawer} open={drawerVisible} height="50%">
          <LoginForm onLogin={handleLogin} isLoggingIn={isLoggingIn} />
        </Drawer>
      )}
    </>
  );
};
