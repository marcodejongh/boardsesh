'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import MuiAvatar from '@mui/material/Avatar';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MuiButton from '@mui/material/Button';
import { PersonOutlined } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import FollowButton from '@/app/components/ui/follow-button';
import SetterClimbList from '@/app/components/climb-list/setter-climb-list';
import { EmptyState } from '@/app/components/ui/empty-state';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_SETTER_PROFILE,
  FOLLOW_SETTER,
  UNFOLLOW_SETTER,
  type GetSetterProfileQueryVariables,
  type GetSetterProfileQueryResponse,
} from '@/app/lib/graphql/operations';
import type { SetterProfile } from '@boardsesh/shared-schema';
import styles from './setter-profile.module.css';

interface SetterProfileContentProps {
  username: string;
}

export default function SetterProfileContent({ username }: SetterProfileContentProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SetterProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const authToken = (session as { authToken?: string } | null)?.authToken ?? null;
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<GetSetterProfileQueryResponse, GetSetterProfileQueryVariables>(
        GET_SETTER_PROFILE,
        { input: { username } }
      );
      setProfile(response.setterProfile);
    } catch (error) {
      console.error('Failed to fetch setter profile:', error);
    } finally {
      setLoading(false);
    }
  }, [username, session]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <Box className={styles.layout}>
        <Box component="main" className={styles.loadingContent}>
          <CircularProgress size={48} />
        </Box>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box className={styles.layout}>
        <Box component="header" className={styles.header}>
          <BackButton fallbackUrl="/" />
          <Logo size="sm" showText={false} />
          <Typography variant="h6" component="h4" className={styles.headerTitle}>
            Setter Profile
          </Typography>
        </Box>
        <Box component="main" className={styles.content}>
          <EmptyState description="Setter not found" />
        </Box>
      </Box>
    );
  }

  const displayName = profile.linkedUserDisplayName || profile.username;
  const avatarUrl = profile.linkedUserAvatarUrl;
  const authToken = (session as { authToken?: string } | null)?.authToken ?? null;

  return (
    <Box className={styles.layout}>
      <Box component="header" className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Typography variant="h6" component="h4" className={styles.headerTitle}>
          Setter Profile
        </Typography>
      </Box>

      <Box component="main" className={styles.content}>
        {/* Profile Card */}
        <MuiCard className={styles.profileCard}>
          <CardContent>
            <div className={styles.profileInfo}>
              <MuiAvatar sx={{ width: 80, height: 80 }} src={avatarUrl ?? undefined}>
                {!avatarUrl && <PersonOutlined />}
              </MuiAvatar>
              <div className={styles.profileDetails}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" component="h4" className={styles.displayName}>
                    {displayName}
                  </Typography>
                  <FollowButton
                    entityId={profile.username}
                    initialIsFollowing={profile.isFollowedByMe}
                    followMutation={FOLLOW_SETTER}
                    unfollowMutation={UNFOLLOW_SETTER}
                    entityLabel="setter"
                    getFollowVariables={(id) => ({ input: { setterUsername: id } })}
                    onFollowChange={(isFollowing) => {
                      if (profile) {
                        setProfile({
                          ...profile,
                          followerCount: profile.followerCount + (isFollowing ? 1 : -1),
                          isFollowedByMe: isFollowing,
                        });
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {profile.followerCount} follower{profile.followerCount !== 1 ? 's' : ''} &middot; {profile.climbCount} climb{profile.climbCount !== 1 ? 's' : ''}
                </Typography>
                <div className={styles.boardBadges}>
                  {profile.boardTypes.map((bt) => (
                    <Chip
                      key={bt}
                      label={bt.charAt(0).toUpperCase() + bt.slice(1)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </div>
                {profile.linkedUserId && (
                  <MuiButton
                    href={`/crusher/${profile.linkedUserId}`}
                    size="small"
                    sx={{ mt: 1, textTransform: 'none', alignSelf: 'flex-start' }}
                  >
                    View Boardsesh profile
                  </MuiButton>
                )}
              </div>
            </div>
          </CardContent>
        </MuiCard>

        {/* Created Climbs */}
        <MuiCard className={styles.climbsCard}>
          <CardContent>
            <Typography variant="h6" component="h5" sx={{ mb: 2 }}>
              Created Climbs
            </Typography>
            <SetterClimbList
              username={profile.username}
              boardTypes={profile.boardTypes}
              authToken={authToken}
            />
          </CardContent>
        </MuiCard>
      </Box>
    </Box>
  );
}
