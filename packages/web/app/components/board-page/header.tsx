'use client';
import React, { useState, useEffect } from 'react';
import { Flex, Button, Dropdown, MenuProps, message } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import SearchButton from '../search-drawer/search-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug, constructClimbInfoUrl, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { ShareBoardButton } from './share-button';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useQueueContext } from '../graphql-queue';
import {
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  PlusOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  HeartOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import AngleSelector from './angle-selector';
import Logo from '../brand/logo';
import styles from './header.module.css';
import Link from 'next/link';

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};
export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const { data: session } = useSession();
  const { logout } = useBoardProvider();
  const { currentClimb, addToQueue, queue } = useQueueContext();
  const pathname = usePathname();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isDuplicate, setDuplicateTimer] = useState(false);

  // Check if we're on the climb info/view page
  const isClimbViewPage = pathname?.includes('/view/');

  // Check if current climb is already in queue
  const isAlreadyInQueue = currentClimb && queue.some((item) => item.climb?.uuid === currentClimb.uuid);

  useEffect(() => {
    // Check if we can go back and if the previous page was on BoardSesh
    const checkCanGoBack = () => {
      if (typeof window !== 'undefined') {
        const hasHistory = window.history.length > 1;
        const referrer = document.referrer;
        const isSameOrigin =
          referrer !== '' && (referrer.startsWith(window.location.origin) || referrer.includes('boardsesh.com'));
        setCanGoBack(hasHistory && isSameOrigin);
      }
    };
    checkCanGoBack();
  }, []);

  const handleSignOut = () => {
    signOut();
    logout(); // Also logout from board provider
  };

  const handleBackClick = () => {
    if (canGoBack) {
      window.history.back();
    } else {
      const backUrl = getBackToListUrl();
      router.push(backUrl);
    }
  };

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    if (layout_name && size_name && set_names && angle !== undefined) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  const handleAddToQueue = () => {
    if (currentClimb && addToQueue && !isDuplicate) {
      addToQueue(currentClimb);
      message.info(`Successfully added ${currentClimb.name || ''} to the queue`);
      setDuplicateTimer(true);
      setTimeout(() => {
        setDuplicateTimer(false);
      }, 3000);
    }
  };

  const handleFavourite = () => {
    message.info('TODO: Implement favourite functionality');
  };

  const handleAddToList = () => {
    message.info('TODO: Implement add to list functionality');
  };

  const handleTick = () => {
    message.info('TODO: Implement tick functionality');
  };

  const auroraAppUrl = currentClimb && angle !== undefined
    ? constructClimbInfoUrl(boardDetails, currentClimb.uuid, angle)
    : null;

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

  // Menu items for climb view page (overflow actions)
  const climbViewMenuItems: MenuProps['items'] = [
    {
      key: 'addToList',
      label: 'Add to List',
      icon: <PlusCircleOutlined />,
      onClick: handleAddToList,
    },
    {
      key: 'tick',
      label: 'Tick',
      icon: <CheckCircleOutlined />,
      onClick: handleTick,
    },
    ...(auroraAppUrl ? [{
      key: 'openInApp',
      label: 'Open in App',
      icon: <AppstoreOutlined />,
      onClick: () => window.open(auroraAppUrl, '_blank', 'noopener'),
    }] : []),
  ];

  const mobileMenuItems: MenuProps['items'] = [
    ...(createClimbUrl && !isClimbViewPage ? [{
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
      className={`${styles.header} header-shadow`}
      style={{
        background: '#fff',
        height: '8dvh',
        minHeight: 48,
        display: 'flex',
        padding: '0 12px',
      }}
    >
      <UISearchParamsProvider>
        <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={8}>
          {/* Logo - Fixed to left */}
          <Flex align="center">
            <Logo size="sm" showText={false} />
          </Flex>

          {/* Center Section */}
          <Flex justify="center" gap={2} style={{ flex: 1 }}>
            {isClimbViewPage ? (
              /* Climb View Controls */
              <>
                {canGoBack ? (
                  <Button icon={<ArrowLeftOutlined />} onClick={handleBackClick}>
                    Back
                  </Button>
                ) : (
                  <Link href={getBackToListUrl()}>
                    <Button icon={<ArrowLeftOutlined />}>
                      Back
                    </Button>
                  </Link>
                )}

                <Button icon={<HeartOutlined />} onClick={handleFavourite} />

                {isAlreadyInQueue ? (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={handleAddToQueue}
                    disabled={isDuplicate}
                    className={styles.inQueueButton}
                  >
                    In Queue
                  </Button>
                ) : (
                  <Button icon={<PlusCircleOutlined />} onClick={handleAddToQueue} disabled={isDuplicate}>
                    Queue
                  </Button>
                )}

                <Dropdown menu={{ items: climbViewMenuItems }} placement="bottomRight" trigger={['click']}>
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              </>
            ) : (
              /* Search Controls - Mobile only */
              <>
                <div className={styles.mobileOnly} style={{ flex: 1 }}>
                  <SearchClimbNameInput />
                </div>
                <div className={styles.mobileOnly}>
                  <SearchButton boardDetails={boardDetails} />
                </div>
              </>
            )}
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} currentClimb={currentClimb} />}

            {/* Desktop: show Create Climb button (not on climb view page) */}
            {createClimbUrl && !isClimbViewPage && (
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

            {/* Mobile: meatball menu for Create Climb and Login (not on climb view page) */}
            {mobileMenuItems.length > 0 && !isClimbViewPage && (
              <div className={styles.mobileMenuButton}>
                <Dropdown menu={{ items: mobileMenuItems }} placement="bottomRight" trigger={['click']}>
                  <Button icon={<MoreOutlined />} type="default" />
                </Dropdown>
              </div>
            )}
          </Flex>
        </Flex>
      </UISearchParamsProvider>
    </Header>
  );
}
