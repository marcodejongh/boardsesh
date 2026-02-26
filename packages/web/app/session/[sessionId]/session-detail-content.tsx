'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import FlashOnOutlined from '@mui/icons-material/FlashOnOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import Link from 'next/link';
import type { SessionDetail } from '@boardsesh/shared-schema';
import GradeDistributionBar from '@/app/components/charts/grade-distribution-bar';
import VoteButton from '@/app/components/social/vote-button';
import CommentSection from '@/app/components/social/comment-section';
import AscentThumbnail from '@/app/components/activity-feed/ascent-thumbnail';

interface SessionDetailContentProps {
  session: SessionDetail | null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SessionDetailContent({ session }: SessionDetailContentProps) {
  if (!session) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton component={Link} href="/">
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6">Session Not Found</Typography>
        </Box>
        <Typography color="text.secondary">
          This session could not be found. It may have been removed.
        </Typography>
      </Box>
    );
  }

  const {
    sessionId,
    sessionType,
    sessionName,
    participants,
    totalSends,
    totalFlashes,
    totalAttempts,
    tickCount,
    gradeDistribution,
    boardTypes,
    hardestGrade,
    firstTickAt,
    lastTickAt,
    durationMinutes,
    goal,
    ticks,
    upvotes,
    downvotes,
    voteScore,
    commentCount,
  } = session;

  return (
    <Box sx={{ minHeight: '100dvh', pb: '60px' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid var(--neutral-200)' }}>
        <IconButton component={Link} href="/" size="small">
          <ArrowBackOutlined />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {sessionName || 'Climbing Session'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(firstTickAt)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Participant card */}
        <Card>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {participants.length > 1 ? (
                <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 14 } }}>
                  {participants.map((p) => (
                    <Avatar key={p.userId} src={p.avatarUrl ?? undefined}>
                      {!p.avatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
                    </Avatar>
                  ))}
                </AvatarGroup>
              ) : participants[0] && (
                <Avatar src={participants[0].avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                  {!participants[0].avatarUrl && <PersonOutlined />}
                </Avatar>
              )}
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {participants.map((p) => p.displayName || 'Climber').join(', ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>

            {/* Per-participant stats */}
            {participants.length > 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                {participants.map((p) => (
                  <Box key={p.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={p.avatarUrl ?? undefined} sx={{ width: 20, height: 20 }}>
                      {!p.avatarUrl && <PersonOutlined sx={{ fontSize: 10 }} />}
                    </Avatar>
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {p.displayName || 'Climber'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.sends}S {p.flashes}F {p.attempts}A
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Goal */}
        {goal && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FlagOutlined sx={{ fontSize: 16 }} color="action" />
            <Typography variant="body2" color="text.secondary">
              Goal: {goal}
            </Typography>
          </Box>
        )}

        {/* Summary stats */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {totalFlashes > 0 && (
            <Chip
              icon={<FlashOnOutlined />}
              label={`${totalFlashes} flash${totalFlashes !== 1 ? 'es' : ''}`}
              sx={{ bgcolor: 'success.main', color: 'success.contrastText', '& .MuiChip-icon': { color: 'inherit' } }}
            />
          )}
          <Chip
            icon={<CheckCircleOutlineOutlined />}
            label={`${totalSends} send${totalSends !== 1 ? 's' : ''}`}
            color="primary"
          />
          {totalAttempts > 0 && (
            <Chip
              icon={<ErrorOutlineOutlined />}
              label={`${totalAttempts} attempt${totalAttempts !== 1 ? 's' : ''}`}
              variant="outlined"
            />
          )}
          {durationMinutes != null && durationMinutes > 0 && (
            <Chip
              icon={<TimerOutlined />}
              label={formatDuration(durationMinutes)}
              variant="outlined"
            />
          )}
          <Chip label={`${tickCount} climb${tickCount !== 1 ? 's' : ''}`} variant="outlined" />
          {hardestGrade && (
            <Chip label={`Hardest: ${hardestGrade}`} variant="outlined" />
          )}
        </Box>

        {/* Board types */}
        {boardTypes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {boardTypes.map((bt) => (
              <Chip
                key={bt}
                label={bt.charAt(0).toUpperCase() + bt.slice(1)}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {/* Full-size grade chart */}
        {gradeDistribution.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Grade Distribution
              </Typography>
              <GradeDistributionBar
                gradeDistribution={gradeDistribution}
                height={200}
                compact={false}
                showAttempts
                stacked
              />
            </CardContent>
          </Card>
        )}

        {/* Session-level social */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VoteButton
            entityType="session"
            entityId={sessionId}
            initialUpvotes={upvotes}
            initialDownvotes={downvotes}
            initialUserVote={0}
            likeOnly
          />
        </Box>

        <CommentSection entityType="session" entityId={sessionId} />

        <Divider />

        {/* Tick list */}
        <Typography variant="subtitle1" fontWeight={600}>
          Climbs ({ticks.length})
        </Typography>

        {ticks.map((tick) => (
          <Card key={tick.uuid}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {/* Thumbnail */}
                {tick.frames && tick.layoutId && (
                  <Box sx={{ width: 60, flexShrink: 0 }}>
                    <AscentThumbnail
                      boardType={tick.boardType}
                      layoutId={tick.layoutId}
                      angle={tick.angle}
                      climbUuid={tick.climbUuid}
                      climbName={tick.climbName || 'Unknown'}
                      frames={tick.frames}
                      isMirror={tick.isMirror}
                    />
                  </Box>
                )}

                {/* Tick info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {tick.climbName || 'Unknown Climb'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                    {tick.difficultyName && (
                      <Chip label={tick.difficultyName} size="small" />
                    )}
                    <Chip
                      label={tick.status}
                      size="small"
                      color={tick.status === 'flash' ? 'success' : tick.status === 'send' ? 'primary' : 'default'}
                      variant={tick.status === 'attempt' ? 'outlined' : 'filled'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {tick.angle}&deg;
                    </Typography>
                    {tick.attemptCount > 1 && (
                      <Typography variant="caption" color="text.secondary">
                        {tick.attemptCount} attempts
                      </Typography>
                    )}
                  </Box>
                  {tick.comment && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {tick.comment}
                    </Typography>
                  )}
                </Box>

                {/* Per-tick vote */}
                <Box sx={{ flexShrink: 0 }}>
                  <VoteButton
                    entityType="tick"
                    entityId={tick.uuid}
                    initialUpvotes={0}
                    initialDownvotes={0}
                    initialUserVote={0}
                    likeOnly
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
