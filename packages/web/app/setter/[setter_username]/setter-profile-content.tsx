'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { PersonOutlined, SentimentDissatisfiedOutlined } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import BackButton from '@/app/components/back-button';
import FollowButton from '@/app/components/ui/follow-button';
import SetterClimbList from '@/app/components/climb-list/setter-climb-list';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_SETTER_PROFILE,
  FOLLOW_SETTER,
  UNFOLLOW_SETTER,
  type GetSetterProfileQueryVariables,
  type GetSetterProfileQueryResponse,
} from '@/app/lib/graphql/operations';
import { themeTokens } from '@/app/theme/theme-config';
import type { SetterProfile } from '@boardsesh/shared-schema';
import styles from '@/app/components/library/playlist-view.module.css';

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
      <div className={styles.loadingContainer}>
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <SentimentDissatisfiedOutlined className={styles.errorIcon} />
        <div className={styles.errorTitle}>Setter Not Found</div>
        <div className={styles.errorMessage}>
          This setter profile may not exist or may have been removed.
        </div>
      </div>
    );
  }

  const displayName = profile.linkedUserDisplayName || profile.username;
  const avatarUrl = profile.linkedUserAvatarUrl;
  const authToken = (session as { authToken?: string } | null)?.authToken ?? null;

  return (
    <>
      {/* Back Button */}
      <div className={styles.actionsSection}>
        <BackButton fallbackUrl="/" />
      </div>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        {/* Hero Card */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div
              className={styles.heroSquare}
              style={{ backgroundColor: themeTokens.colors.primary, overflow: 'hidden' }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <PersonOutlined className={styles.heroSquareIcon} />
              )}
            </div>
            <div className={styles.heroInfo}>
              <Typography variant="h5" component="h2" className={styles.heroName}>
                {displayName}
              </Typography>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}>
                  {profile.followerCount} {profile.followerCount === 1 ? 'follower' : 'followers'}
                </span>
                <span className={styles.heroMetaItem}>
                  {profile.climbCount} {profile.climbCount === 1 ? 'climb' : 'climbs'}
                </span>
              </div>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {profile.boardTypes.map((bt) => (
                  <Chip
                    key={bt}
                    label={bt.charAt(0).toUpperCase() + bt.slice(1)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
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
            </div>
          </div>
        </div>

        {/* Climbs Section */}
        <div className={styles.climbsSection}>
          <SetterClimbList
            username={profile.username}
            boardTypes={profile.boardTypes}
            authToken={authToken}
          />
        </div>
      </div>
    </>
  );
}
