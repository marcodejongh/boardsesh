'use client';
import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Flex, Button, Dropdown, MenuProps, Badge } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import SearchButton from '../search-drawer/search-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import { BoardDetails } from '@/app/lib/types';
import { ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';
import { useDrafts } from '../drafts/drafts-context';
import { DraftsDrawer } from '../drafts/drafts-drawer';

// Dynamically import bluetooth component to reduce initial bundle size
// LED placement data (~50KB) is only loaded when bluetooth is actually used
const SendClimbToBoardButton = dynamic(
  () => import('../board-bluetooth-control/send-climb-to-board-button'),
  { ssr: false }
);
import { generateLayoutSlug, generateSizeSlug, generateSetSlug, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { ShareBoardButton } from './share-button';
import { useQueueContext } from '../graphql-queue';
import { UserOutlined, LogoutOutlined, LoginOutlined, PlusOutlined, MoreOutlined, SettingOutlined, LineChartOutlined, LeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import AngleSelector from './angle-selector';
import Logo from '../brand/logo';
import styles from './header.module.css';
import Link from 'next/link';
import AuthModal from '../auth/auth-modal';
import { useCreateClimbContext } from '../create-climb/create-climb-context';

type PageMode = 'list' | 'view' | 'play' | 'create' | 'other';

// Separate component for create mode buttons to avoid unnecessary context subscription on non-create pages
function CreateModeButtons() {
  const createClimbContext = useCreateClimbContext();

  if (!createClimbContext) return null;

  return (
    <>
      <Button onClick={createClimbContext.onCancel} disabled={createClimbContext.isPublishing}>
        Cancel
      </Button>
      <ExperimentOutlined style={{ color: themeTokens.colors.primary }} title="Beta Feature" />
      <Button
        type="primary"
        onClick={createClimbContext.onPublish}
        loading={createClimbContext.isPublishing}
        disabled={!createClimbContext.canPublish || createClimbContext.isPublishing}
      >
        {createClimbContext.isPublishing ? 'Publishing...' : 'Publish'}
      </Button>
    </>
  );
}

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};

function usePageMode(): PageMode {
  const pathname = usePathname();

  return useMemo(() => {
    if (pathname.includes('/play/')) return 'play';
    if (pathname.includes('/view/')) return 'view';
    if (pathname.includes('/list')) return 'list';
    if (pathname.includes('/create')) return 'create';
    return 'other';
  }, [pathname]);
}

export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const { data: session } = useSession();
  const { currentClimb } = useQueueContext();
  const { draftsCount } = useDrafts();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDraftsDrawer, setShowDraftsDrawer] = useState(false);
  const pageMode = usePageMode();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Build back to list URL for play/view pages
  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    let baseUrl: string;
    if (layout_name && size_name && set_names && angle !== undefined) {
      baseUrl = constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    } else {
      baseUrl = `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
    }

    // Preserve search params when going back
    const queryString = searchParams.toString();
    if (queryString) {
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  };

  const handleSignOut = () => {
    signOut();
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <LineChartOutlined />,
      label: <Link href={`/crusher/${session?.user?.id}`}>Profile</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href="/settings">Settings</Link>,
    },
    {
      type: 'divider',
    },
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
    ...(session?.user ? [
      {
        key: 'profile',
        icon: <LineChartOutlined />,
        label: <Link href={`/crusher/${session.user.id}`}>Profile</Link>,
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <Link href="/settings">Settings</Link>,
      },
      {
        key: 'about',
        icon: <InfoCircleOutlined />,
        label: <Link href="/about">About</Link>,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleSignOut,
      },
    ] : []),
    ...(!session?.user ? [
      {
        key: 'about',
        icon: <InfoCircleOutlined />,
        label: <Link href="/about">About</Link>,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'login',
        icon: <LoginOutlined />,
        label: 'Login',
        onClick: () => setShowAuthModal(true),
      },
    ] : []),
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
          {/* Logo and back button - Fixed to left */}
          <Flex align="center" gap={4}>
            {/* Play page: Show back button next to logo (mobile only) */}
            {pageMode === 'play' && (
              <div className={styles.mobileOnly}>
                <Button
                  icon={<LeftOutlined />}
                  type="text"
                  aria-label="Back to climb list"
                  onClick={() => router.push(getBackToListUrl())}
                />
              </div>
            )}
            <Logo size="sm" showText={false} />
          </Flex>

          {/* Center Section - Content varies by page mode */}
          <Flex justify="center" gap={2} style={{ flex: 1 }} align="center">
            {/* List page: Show search (mobile only) */}
            {pageMode === 'list' && (
              <>
                <div className={styles.mobileOnly} style={{ flex: 1 }}>
                  <SearchClimbNameInput />
                </div>
                <div className={styles.mobileOnly}>
                  <SearchButton boardDetails={boardDetails} />
                </div>
              </>
            )}

            {/* View page: Empty center on mobile (back button is in the page content) */}
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            {/* Create mode: Show cancel, drafts, and publish buttons */}
            {pageMode === 'create' ? (
              <>
                <CreateModeButtons />
                {/* Drafts button with badge - only shown on create page */}
                {draftsCount > 0 && (
                  <Badge count={draftsCount} size="small" offset={[-4, 4]}>
                    <Button
                      icon={<FileTextOutlined />}
                      type="text"
                      title="View drafts"
                      onClick={() => setShowDraftsDrawer(true)}
                    />
                  </Badge>
                )}
              </>
            ) : (
              <>
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

                {/* Desktop: User menu or login button */}
                <div className={styles.desktopOnly}>
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
                      onClick={() => setShowAuthModal(true)}
                    >
                      Login
                    </Button>
                  )}
                </div>

                {/* Mobile: meatball menu for Create Climb and Login */}
                {mobileMenuItems.length > 0 && (
                  <div className={styles.mobileMenuButton}>
                    <Dropdown menu={{ items: mobileMenuItems }} placement="bottomRight" trigger={['click']}>
                      <Button icon={<MoreOutlined />} type="default" />
                    </Dropdown>
                  </div>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </UISearchParamsProvider>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to access all features including saving favorites, tracking ascents, and more."
      />

      <DraftsDrawer
        open={showDraftsDrawer}
        onClose={() => setShowDraftsDrawer(false)}
      />
    </Header>
  );
}
