'use client';
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import SearchPill from '../search-drawer/search-pill';
import SearchDropdown from '../search-drawer/search-dropdown';
import { BoardDetails } from '@/app/lib/types';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import { themeTokens } from '@/app/theme/theme-config';

import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { useQueueContext } from '../graphql-queue';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import AngleSelector from './angle-selector';
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
      <Button variant="outlined" onClick={createClimbContext.onCancel} disabled={createClimbContext.isPublishing}>
        Cancel
      </Button>
      <ScienceOutlined sx={{ color: themeTokens.colors.primary }} titleAccess="Beta Feature" />
      <Button
        variant="contained"
        onClick={createClimbContext.onPublish}
        disabled={!createClimbContext.canPublish || createClimbContext.isPublishing}
        startIcon={createClimbContext.isPublishing ? <CircularProgress size={16} /> : undefined}
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
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

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
    <Box
      component="header"
      className={`${styles.header} header-shadow`}
      sx={{
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
        {/* Left section: Avatar + Back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {pageMode !== 'create' && (
            <UserDrawer boardDetails={boardDetails} angle={angle} />
          )}

          {/* Play page: Show back button next to logo (mobile only) */}
          {pageMode === 'play' && (
            <div className={styles.mobileOnly}>
              <IconButton
                aria-label="Back to climb list"
                onClick={() => router.push(getBackToListUrl())}
              >
                <ChevronLeftOutlined />
              </IconButton>
            </div>
          )}
        </Box>

        {/* Center Section - Content varies by page mode */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: '2px', flex: 1, alignItems: 'center' }}>
          {/* List page: Show search pill (mobile only) */}
          {pageMode === 'list' && (
            <div className={styles.mobileOnly} style={{ flex: 1 }}>
              <SearchPill onClick={() => setSearchDropdownOpen(true)} />
            </div>
          )}
        </Box>

        {/* Right Section */}
        <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                    <IconButton title="Create new climb">
                      <AddOutlined />
                    </IconButton>
                  </Link>
                </div>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Search dropdown drawer (mobile) */}
      <SearchDropdown
        boardDetails={boardDetails}
        open={searchDropdownOpen}
        onClose={() => setSearchDropdownOpen(false)}
      />
    </Box>
  );
}
