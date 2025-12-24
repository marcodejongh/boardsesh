'use client';
import React from 'react';
import { Flex, Button, Dropdown, MenuProps } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import SearchButton from '../search-drawer/search-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { ShareBoardButton } from './share-button';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useQueueContext } from '../graphql-queue';
import { UserOutlined, LogoutOutlined, LoginOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import AngleSelector from './angle-selector';
import styles from './header.module.css';

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};
export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
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

  const createClimbUrl = angle !== undefined && boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
    ? `/${boardDetails.board_name}/${generateLayoutSlug(boardDetails.layout_name)}/${generateSizeSlug(boardDetails.size_name)}/${generateSetSlug(boardDetails.set_names)}/${angle}/create`
    : null;

  const mobileMenuItems: MenuProps['items'] = [
    ...(createClimbUrl ? [{
      key: 'create-climb',
      icon: <PlusOutlined />,
      label: <Link href={createClimbUrl}>Create Climb</Link>,
    }] : []),
    ...(!session?.user ? [{
      key: 'login',
      icon: <LoginOutlined />,
      label: 'Login',
      onClick: () => signIn(),
    }] : []),
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
          <Flex justify="center" gap={2} style={{ flex: 1 }}>
            <div className={styles.mobileOnly} style={{ flex: 1 }}>
              <SearchClimbNameInput />
            </div>
            <div className={styles.mobileOnly}>
              <SearchButton boardDetails={boardDetails} />
            </div>
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} currentClimb={currentClimb} />}

            {/* Desktop: show Create Climb button */}
            {createClimbUrl && (
              <div className={styles.desktopOnly}>
                <Link href={createClimbUrl}>
                  <Button icon={<PlusOutlined />} type="text" title="Create new climb" />
                </Link>
              </div>
            )}

            <ShareBoardButton />
            <SendClimbToBoardButton boardDetails={boardDetails} />

            {/* User menu or login button */}
            {session?.user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button icon={<UserOutlined />} type="text">
                  {session.user.name || session.user.email}
                </Button>
              </Dropdown>
            ) : (
              <div className={styles.desktopOnly}>
                <Button
                  icon={<LoginOutlined />}
                  type="text"
                  onClick={() => signIn()}
                >
                  Login
                </Button>
              </div>
            )}

            {/* Mobile: meatball menu for Create Climb and Login */}
            {mobileMenuItems.length > 0 && (
              <div className={styles.mobileMenuButton}>
                <Dropdown menu={{ items: mobileMenuItems }} placement="bottomRight" trigger={['click']}>
                  <Button icon={<MoreOutlined />} type="text" />
                </Dropdown>
              </div>
            )}
          </Flex>
        </Flex>
      </UISearchParamsProvider>
    </Header>
  );
}
