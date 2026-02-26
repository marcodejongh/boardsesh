'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import FlashOnOutlined from '@mui/icons-material/FlashOnOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import RemoveCircleOutlineOutlined from '@mui/icons-material/RemoveCircleOutlineOutlined';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { SessionDetail, SessionDetailTick, SessionFeedParticipant } from '@boardsesh/shared-schema';
import GradeDistributionBar from '@/app/components/charts/grade-distribution-bar';
import VoteButton from '@/app/components/social/vote-button';
import CommentSection from '@/app/components/social/comment-section';
import AscentThumbnail from '@/app/components/activity-feed/ascent-thumbnail';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  UPDATE_INFERRED_SESSION,
  ADD_USER_TO_SESSION,
  REMOVE_USER_FROM_SESSION,
} from '@/app/lib/graphql/operations/activity-feed';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { themeTokens } from '@/app/theme/theme-config';
import UserSearchDialog from './user-search-dialog';

interface SessionDetailContentProps {
  session: SessionDetail | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateSessionName(firstTickAt: string, boardTypes: string[]): string {
  const day = DAYS[new Date(firstTickAt).getDay()];
  const boards = boardTypes
    .map((bt) => bt.charAt(0).toUpperCase() + bt.slice(1))
    .join(' & ');
  return `${day} ${boards} Session`;
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

/** Group of ticks for the same climb (climbUuid) */
interface ClimbGroup {
  climbUuid: string;
  climbName: string | null;
  boardType: string;
  layoutId: number | null;
  angle: number;
  frames: string | null;
  isMirror: boolean;
  difficultyName: string | null;
  ticks: SessionDetailTick[];
}

/**
 * Group ticks by climbUuid, preserving the order of first appearance.
 * Each group contains all ticks for that climb (potentially from multiple users).
 */
function groupTicksByClimb(ticks: SessionDetailTick[]): ClimbGroup[] {
  const groupMap = new Map<string, ClimbGroup>();
  const order: string[] = [];

  for (const tick of ticks) {
    const key = tick.climbUuid;
    const existing = groupMap.get(key);
    if (existing) {
      existing.ticks.push(tick);
    } else {
      order.push(key);
      groupMap.set(key, {
        climbUuid: tick.climbUuid,
        climbName: tick.climbName ?? null,
        boardType: tick.boardType,
        layoutId: tick.layoutId ?? null,
        angle: tick.angle,
        frames: tick.frames ?? null,
        isMirror: tick.isMirror,
        difficultyName: tick.difficultyName ?? null,
        ticks: [tick],
      });
    }
  }

  return order.map((key) => groupMap.get(key)!);
}

function getStatusColor(status: string): 'success' | 'primary' | 'default' {
  if (status === 'flash') return 'success';
  if (status === 'send') return 'primary';
  return 'default';
}

export default function SessionDetailContent({ session: initialSession }: SessionDetailContentProps) {
  const { data: authSession } = useSession();
  const { token: authToken } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const [session, setSession] = useState(initialSession);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

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
    commentCount,
  } = session;

  const currentUserId = authSession?.user?.id;
  const isInferred = sessionType === 'inferred';
  const isParticipant = currentUserId
    ? participants.some((p) => p.userId === currentUserId)
    : false;
  const canEdit = isInferred && isParticipant;

  const isMultiUser = participants.length > 1;
  const displayName = sessionName || generateSessionName(firstTickAt, boardTypes);

  // Build a lookup from userId to participant info
  const participantMap = new Map<string, SessionFeedParticipant>();
  for (const p of participants) {
    participantMap.set(p.userId, p);
  }

  // For multi-user sessions, group ticks by climb to show per-user results
  const climbGroups = isMultiUser ? groupTicksByClimb(ticks) : null;

  // Determine which user is the "owner" (first participant by convention)
  const ownerUserId = participants[0]?.userId;

  const handleStartEdit = useCallback(() => {
    setEditName(sessionName || '');
    setEditDescription(goal || '');
    setIsEditing(true);
  }, [sessionName, goal]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const client = createGraphQLHttpClient(authToken);
      const result = await client.request<{ updateInferredSession: SessionDetail }>(
        UPDATE_INFERRED_SESSION,
        {
          input: {
            sessionId,
            name: editName || null,
            description: editDescription || null,
          },
        },
      );
      if (result.updateInferredSession) {
        setSession(result.updateInferredSession);
      }
      setIsEditing(false);
      showMessage('Session updated', 'success');
    } catch (err) {
      console.error('Failed to update session:', err);
      showMessage('Failed to update session', 'error');
    } finally {
      setSaving(false);
    }
  }, [authToken, sessionId, editName, editDescription, showMessage]);

  const handleAddUser = useCallback(async (userId: string) => {
    setAddUserDialogOpen(false);
    setSaving(true);
    try {
      const client = createGraphQLHttpClient(authToken);
      const result = await client.request<{ addUserToSession: SessionDetail }>(
        ADD_USER_TO_SESSION,
        { input: { sessionId, userId } },
      );
      if (result.addUserToSession) {
        setSession(result.addUserToSession);
      }
      showMessage('User added to session', 'success');
    } catch (err) {
      console.error('Failed to add user:', err);
      showMessage('Failed to add user to session', 'error');
    } finally {
      setSaving(false);
    }
  }, [authToken, sessionId, showMessage]);

  const handleRemoveUser = useCallback(async (userId: string) => {
    setRemovingUserId(userId);
    try {
      const client = createGraphQLHttpClient(authToken);
      const result = await client.request<{ removeUserFromSession: SessionDetail }>(
        REMOVE_USER_FROM_SESSION,
        { input: { sessionId, userId } },
      );
      if (result.removeUserFromSession) {
        setSession(result.removeUserFromSession);
      }
      showMessage('User removed from session', 'success');
    } catch (err) {
      console.error('Failed to remove user:', err);
      showMessage('Failed to remove user', 'error');
    } finally {
      setRemovingUserId(null);
    }
  }, [authToken, sessionId, showMessage]);

  return (
    <Box sx={{ minHeight: '100dvh', pb: '60px' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: `1px solid ${themeTokens.neutral[200]}` }}>
        <IconButton component={Link} href="/" size="small">
          <ArrowBackOutlined />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <TextField
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={generateSessionName(firstTickAt, boardTypes)}
              size="small"
              fullWidth
              autoFocus
            />
          ) : (
            <Typography variant="h6" noWrap>
              {displayName}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatDate(firstTickAt)}
          </Typography>
        </Box>
        {canEdit && !isEditing && (
          <IconButton size="small" onClick={handleStartEdit}>
            <EditOutlined fontSize="small" />
          </IconButton>
        )}
        {isEditing && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={handleCancelEdit} disabled={saving}>
              <CloseOutlined fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleSaveEdit} disabled={saving} color="primary">
              {saving ? <CircularProgress size={18} /> : <CheckOutlined fontSize="small" />}
            </IconButton>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Participant card */}
        <Card>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {isMultiUser ? (
                <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 14 } }}>
                  {participants.map((p) => (
                    <Avatar
                      key={p.userId}
                      src={p.avatarUrl ?? undefined}
                      component="a"
                      href={`/crusher/${p.userId}`}
                    >
                      {!p.avatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
                    </Avatar>
                  ))}
                </AvatarGroup>
              ) : participants[0] && (
                <Avatar
                  src={participants[0].avatarUrl ?? undefined}
                  component="a"
                  href={`/crusher/${participants[0].userId}`}
                  sx={{ width: 40, height: 40 }}
                >
                  {!participants[0].avatarUrl && <PersonOutlined />}
                </Avatar>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {participants.map((p) => p.displayName || 'Climber').join(', ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              {canEdit && (
                <IconButton size="small" onClick={() => setAddUserDialogOpen(true)} disabled={saving}>
                  <PersonAddOutlined fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Per-participant stats */}
            {isMultiUser && (
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
                    {/* Show remove button for non-owner participants when editing */}
                    {canEdit && p.userId !== ownerUserId && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveUser(p.userId)}
                        disabled={removingUserId === p.userId}
                        sx={{ p: 0.25 }}
                      >
                        {removingUserId === p.userId ? (
                          <CircularProgress size={14} />
                        ) : (
                          <RemoveCircleOutlineOutlined sx={{ fontSize: 14 }} color="error" />
                        )}
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Goal / Description */}
        {isEditing ? (
          <TextField
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Session notes or goal..."
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
        ) : goal ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FlagOutlined sx={{ fontSize: 16 }} color="action" />
            <Typography variant="body2" color="text.secondary">
              Goal: {goal}
            </Typography>
          </Box>
        ) : null}

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
          Climbs ({isMultiUser ? climbGroups!.length : ticks.length})
        </Typography>

        {isMultiUser && climbGroups ? (
          /* Multi-user: group by climb, show per-user results */
          climbGroups.map((group) => (
            <Card key={group.climbUuid}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {/* Thumbnail */}
                  {group.frames && group.layoutId && (
                    <Box sx={{ width: 60, flexShrink: 0 }}>
                      <AscentThumbnail
                        boardType={group.boardType}
                        layoutId={group.layoutId}
                        angle={group.angle}
                        climbUuid={group.climbUuid}
                        climbName={group.climbName || 'Unknown'}
                        frames={group.frames}
                        isMirror={group.isMirror}
                      />
                    </Box>
                  )}

                  {/* Climb info + per-user results */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {group.climbName || 'Unknown Climb'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                      {group.difficultyName && (
                        <Chip label={group.difficultyName} size="small" />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {group.angle}&deg;
                      </Typography>
                    </Box>

                    {/* Per-user tick rows */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                      {group.ticks.map((tick) => {
                        const participant = participantMap.get(tick.userId);
                        return (
                          <Box
                            key={tick.uuid}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              py: 0.25,
                              borderTop: `1px solid ${themeTokens.neutral[100]}`,
                            }}
                          >
                            <Avatar
                              src={participant?.avatarUrl ?? undefined}
                              sx={{ width: 18, height: 18 }}
                            >
                              {!participant?.avatarUrl && <PersonOutlined sx={{ fontSize: 10 }} />}
                            </Avatar>
                            <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap>
                              {participant?.displayName || 'Climber'}
                            </Typography>
                            <Chip
                              label={tick.status}
                              size="small"
                              color={getStatusColor(tick.status)}
                              variant={tick.status === 'attempt' ? 'outlined' : 'filled'}
                              sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: themeTokens.typography.fontSize.xs - 1 } }}
                            />
                            {tick.attemptCount > 1 && (
                              <Typography variant="caption" color="text.secondary">
                                {tick.attemptCount}x
                              </Typography>
                            )}
                            <VoteButton
                              entityType="tick"
                              entityId={tick.uuid}
                              initialUpvotes={0}
                              initialDownvotes={0}
                              initialUserVote={0}
                              likeOnly
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        ) : (
          /* Single-user: show flat tick list */
          ticks.map((tick) => (
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
                        color={getStatusColor(tick.status)}
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
          ))
        )}
      </Box>

      {/* Add User Dialog */}
      <UserSearchDialog
        open={addUserDialogOpen}
        onClose={() => setAddUserDialogOpen(false)}
        onSelectUser={handleAddUser}
        excludeUserIds={participants.map((p) => p.userId)}
      />
    </Box>
  );
}
