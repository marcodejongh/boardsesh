'use client';
import React from 'react';
import { Flex, Button, Dropdown, MenuProps, Grid } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import SearchButton from '../search-drawer/search-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { ShareBoardButton } from './share-button';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useQueueContext } from '../queue-control/queue-context';
import { UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import AngleSelector from './angle-selector';
import styles from './header.module.css';

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};
export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const { data: session } = useSession();
  const { logout } = useBoardProvider();
  const { currentClimb } = useQueueContext();

  const handleSignOut = () => {
    signOut();
    logout(); // Also logout from board provider
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleSignOut,
    },
  ];
  return (
    <Header
      style={{
        background: '#fff',
        height: '8dvh',
        display: 'flex',
        padding: '0 4px',
      }}
    >
      <UISearchParamsProvider>
        <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={7}>
          {/* Logo - Fixed to left */}
          <Flex>
            <Title level={4} style={{ margin: 0, lineHeight: '1.2', whiteSpace: 'nowrap' }}>
              <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                BS
              </Link>
            </Title>
          </Flex>

          {/* Center Section - Mobile only */}
          <Flex justify="center" gap={2}>
            <div className={styles.mobileOnly}>
              <SearchClimbNameInput />
            </div>
            <div className={styles.mobileOnly}>
              <SearchButton boardDetails={boardDetails} />
            </div>
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} currentClimb={currentClimb} />}
            <ShareBoardButton />
            <SendClimbToBoardButton boardDetails={boardDetails} />
            {session?.user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button icon={<UserOutlined />} type="text">
                  {session.user.name || session.user.email}
                </Button>
              </Dropdown>
            ) : (
              <Button 
                icon={<LoginOutlined />} 
                type="text" 
                onClick={() => signIn()}
                size={screens.xs ? 'small' : 'middle'}
              >
                {screens.xs ? '' : 'Login'}
              </Button>
            )}
          </Flex>
        </Flex>
      </UISearchParamsProvider>
    </Header>
  );
}
