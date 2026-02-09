'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import Logo from '@/app/components/brand/logo';
import FollowingAscentsFeed from '@/app/components/social/following-ascents-feed';
import UserSearchDrawer from '@/app/components/social/user-search-drawer';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDefaultBoardCookieClient } from '@/app/lib/default-board-cookie';
import { themeTokens } from '@/app/theme/theme-config';

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const TabButton = ({ label, icon, active, onClick }: TabButtonProps) => (
  <Box
    component="button"
    onClick={onClick}
    role="tab"
    aria-label={label}
    aria-selected={active}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      py: '6px',
      cursor: 'pointer',
      color: active ? themeTokens.colors.primary : themeTokens.neutral[400],
      transition: 'color 150ms ease',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      userSelect: 'none',
      background: 'none',
      border: 'none',
    }}
  >
    {icon}
    <Typography sx={{ fontSize: 10, mt: '2px', lineHeight: 1 }}>{label}</Typography>
  </Box>
);

export default function HomePageContent() {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const handleBoardNav = (suffix: string) => {
    const boardUrl = getDefaultBoardCookieClient();
    if (boardUrl) {
      // Default board cookie stores path like /kilter/original/12x12/led/40/list
      // Strip the trailing segment (/list, /playlists, etc.) and append the desired one
      const basePath = boardUrl.replace(/\/[^/]+$/, '');
      router.push(`${basePath}/${suffix}`);
    } else {
      router.push('/?select=true');
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', pb: '60px' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        <Logo size="sm" showText={false} linkToHome={false} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <MuiButton
            startIcon={<PersonSearchOutlined />}
            onClick={() => setSearchOpen(true)}
            size="small"
            variant="outlined"
          >
            Find Climbers
          </MuiButton>
          {session?.user?.id && (
            <MuiButton
              component={Link}
              href={`/crusher/${session.user.id}`}
              size="small"
              variant="text"
            >
              Profile
            </MuiButton>
          )}
        </Box>
      </Box>

      {/* Feed */}
      <Box component="main" sx={{ flex: 1, px: 2, py: 2 }}>
        <Typography variant="h6" component="h1" sx={{ mb: 2 }}>
          Activity
        </Typography>
        <FollowingAscentsFeed onFindClimbers={() => setSearchOpen(true)} />
      </Box>

      {/* Bottom Tab Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.4)',
          WebkitBackdropFilter: 'blur(10px)',
          backdropFilter: 'blur(10px)',
          pt: '4px',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <TabButton label="Home" icon={<HomeOutlined sx={{ fontSize: 20 }} />} active />
        <TabButton label="Climb" icon={<FormatListBulletedOutlined sx={{ fontSize: 20 }} />} onClick={() => handleBoardNav('list')} />
        <TabButton label="Your Library" icon={<LocalOfferOutlined sx={{ fontSize: 20 }} />} onClick={() => handleBoardNav('playlists')} />
        <TabButton label="Create" icon={<AddOutlined sx={{ fontSize: 20 }} />} onClick={() => handleBoardNav('create')} />
      </Box>

      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
