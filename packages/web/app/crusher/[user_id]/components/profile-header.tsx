'use client';

import React from 'react';
import MuiAvatar from '@mui/material/Avatar';
import MuiTooltip from '@mui/material/Tooltip';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { PersonOutlined, Instagram } from '@mui/icons-material';
import FollowButton from '@/app/components/ui/follow-button';
import FollowerCount from '@/app/components/social/follower-count';
import { FOLLOW_USER, UNFOLLOW_USER } from '@/app/lib/graphql/operations';
import type { UserProfile } from '../utils/profile-constants';
import type { LayoutPercentage } from '../utils/chart-data-builders';
import { difficultyMapping, getGradeChartColor } from '../utils/profile-constants';
import styles from '../profile-page.module.css';

interface ProfileHeaderProps {
  userId: string;
  profile: UserProfile;
  isOwnProfile: boolean;
  statisticsSummary: {
    totalAscents: number;
    layoutPercentages: LayoutPercentage[];
  };
  loadingProfileStats: boolean;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function ProfileHeader({
  userId,
  profile,
  isOwnProfile,
  statisticsSummary,
  loadingProfileStats,
  onProfileUpdate,
}: ProfileHeaderProps) {
  const displayName = profile.profile?.displayName || profile.name || 'Crusher';
  const avatarUrl = profile.profile?.avatarUrl || profile.image;
  const instagramUrl = profile.profile?.instagramUrl;

  return (
    <>
      {/* Profile Card */}
      <MuiCard className={styles.profileCard}><CardContent>
        <div className={styles.profileInfo}>
          <MuiAvatar sx={{ width: 80, height: 80 }} src={avatarUrl ?? undefined}>
            {!avatarUrl && <PersonOutlined />}
          </MuiAvatar>
          <div className={styles.profileDetails}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="h4" className={styles.displayName}>
                {displayName}
              </Typography>
              {!isOwnProfile && (
                <FollowButton
                  entityId={userId}
                  initialIsFollowing={profile.isFollowedByMe}
                  followMutation={FOLLOW_USER}
                  unfollowMutation={UNFOLLOW_USER}
                  entityLabel="user"
                  getFollowVariables={(id) => ({ input: { userId: id } })}
                  onFollowChange={(isFollowing) => {
                    onProfileUpdate({
                      ...profile,
                      followerCount: profile.followerCount + (isFollowing ? 1 : -1),
                      isFollowedByMe: isFollowing,
                    });
                  }}
                />
              )}
            </Box>
            <FollowerCount
              userId={userId}
              followerCount={profile.followerCount}
              followingCount={profile.followingCount}
            />
            {isOwnProfile && (
              <Typography variant="body2" component="span" color="text.secondary">{profile.email}</Typography>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl.startsWith('http') ? instagramUrl : `https://${instagramUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.instagramLink}
              >
                <Instagram className={styles.instagramIcon} />
                <span>{instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</span>
              </a>
            )}
          </div>
        </div>
      </CardContent></MuiCard>

      {/* Statistics Summary Card */}
      {!loadingProfileStats && statisticsSummary.totalAscents > 0 && (
        <MuiCard className={styles.statsCard}><CardContent>
          <div className={styles.statsSummaryHeader}>
            <div className={styles.totalAscentsContainer}>
              <Typography variant="body2" component="span" className={styles.totalAscentsLabel}>Distinct Climbs</Typography>
              <Typography variant="h4" component="h2" className={styles.totalAscentsValue}>
                {statisticsSummary.totalAscents}
              </Typography>
            </div>
          </div>

          <div className={styles.percentageBarContainer}>
            <div className={styles.percentageBar}>
              {statisticsSummary.layoutPercentages.map((layout) => (
                <MuiTooltip
                  key={layout.layoutKey}
                  title={`${layout.displayName}: ${layout.count} distinct climbs (${layout.percentage}%)`}
                >
                  <div
                    className={styles.percentageSegment}
                    style={{ width: `${layout.percentage}%`, backgroundColor: layout.color }}
                  >
                    {layout.percentage >= 15 && (
                      <span className={styles.percentageLabel}>
                        {layout.displayName.split(' ').slice(-1)[0]} {layout.percentage}%
                      </span>
                    )}
                  </div>
                </MuiTooltip>
              ))}
            </div>
            <div className={styles.percentageLegend}>
              {statisticsSummary.layoutPercentages.map((layout) => (
                <div key={layout.layoutKey} className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: layout.color }} />
                  <Typography variant="body2" component="span" className={styles.legendText}>
                    {layout.displayName} ({layout.percentage}%)
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.gradeBlocksContainer}>
            <Typography variant="body2" component="span" fontWeight={600} className={styles.gradeBlocksTitle}>
              Grades by Board
            </Typography>
            {statisticsSummary.layoutPercentages.map((layout) => (
              <div key={layout.layoutKey} className={styles.layoutGradeRow}>
                <div className={styles.layoutGradeHeader}>
                  <div className={styles.layoutIndicator} style={{ backgroundColor: layout.color }} />
                  <Typography variant="body2" component="span" className={styles.layoutName}>
                    {layout.displayName}
                  </Typography>
                  <Typography variant="body2" component="span" color="text.secondary" className={styles.layoutCount}>
                    {layout.count} climbs
                  </Typography>
                </div>
                <div className={styles.gradeBlocks}>
                  {Object.entries(layout.grades)
                    .sort((a, b) => {
                      const gradeOrder = Object.values(difficultyMapping);
                      return gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0]);
                    })
                    .map(([grade, count]) => (
                      <MuiTooltip key={grade} title={`${grade}: ${count} climb${count !== 1 ? 's' : ''}`}>
                        <div className={styles.gradeBlock} style={{ backgroundColor: getGradeChartColor(grade) }}>
                          <span className={styles.gradeBlockLabel}>{grade}</span>
                          <span className={styles.gradeBlockCount}>{count}</span>
                        </div>
                      </MuiTooltip>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent></MuiCard>
      )}
    </>
  );
}
