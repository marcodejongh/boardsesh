'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { Flex, Button } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import SearchButton from '../search-drawer/search-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import { BoardDetails } from '@/app/lib/types';
import { ExperimentOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';

// Dynamically import bluetooth component to reduce initial bundle size
// LED placement data (~50KB) is only loaded when bluetooth is actually used
const SendClimbToBoardButton = dynamic(
  () => import('../board-bluetooth-control/send-climb-to-board-button'),
  { ssr: false }
);
import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { ShareBoardButton } from './share-button';
import { useQueueContext } from '../graphql-queue';
import { PlusOutlined, LeftOutlined } from '@ant-design/icons';
import AngleSelector from './angle-selector';
import Logo from '../brand/logo';
import styles from './header.module.css';
import Link from 'next/link';
import { useCreateClimbContext } from '../create-climb/create-climb-context';
import UserDrawer from '../user-drawer/user-drawer';

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

  return React.useMemo(() => {
    if (pathname.includes('/play/')) return 'play';
    if (pathname.includes('/view/')) return 'view';
    if (pathname.includes('/list')) return 'list';
    if (pathname.includes('/create')) return 'create';
    return 'other';
  }, [pathname]);
}

export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const { currentClimb } = useQueueContext();
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

  const createClimbUrl = angle !== undefined && boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
    ? `/${boardDetails.board_name}/${generateLayoutSlug(boardDetails.layout_name)}/${generateSizeSlug(boardDetails.size_name, boardDetails.size_description)}/${generateSetSlug(boardDetails.set_names)}/${angle}/create`
    : null;

  return (
    <Header
      className={`${styles.header} header-shadow`}
      style={{
        background: 'var(--semantic-surface)',
        height: '8dvh',
        minHeight: 48,
        lineHeight: 'normal',
        display: 'flex',
        padding: '0 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <UISearchParamsProvider>
        <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={8}>
          {/* Left section: Avatar + Logo + Back button */}
          <Flex align="center" gap={4}>
            {pageMode !== 'create' && (
              <UserDrawer boardDetails={boardDetails} angle={angle} />
            )}

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
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            {/* Create mode: Show cancel and publish buttons */}
            {pageMode === 'create' ? (
              <CreateModeButtons />
            ) : (
              <>
                {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} boardDetails={boardDetails} currentAngle={angle} currentClimb={currentClimb} />}

                {/* Desktop: show Create Climb button */}
                {createClimbUrl && (
                  <div className={styles.desktopOnly}>
                    <Link href={createClimbUrl}>
                      <Button icon={<PlusOutlined />} type="text" title="Create new climb" />
                    </Link>
                  </div>
                )}

                <span id="onboarding-party-light-buttons" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <ShareBoardButton />
                  <SendClimbToBoardButton />
                </span>
              </>
            )}
          </Flex>
        </Flex>
      </UISearchParamsProvider>
    </Header>
  );
}
