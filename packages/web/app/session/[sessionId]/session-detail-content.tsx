'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { SessionDetail, SessionDetailTick, SessionFeedParticipant } from '@boardsesh/shared-schema';
import GradeDistributionBar from '@/app/components/charts/grade-distribution-bar';
import VoteButton from '@/app/components/social/vote-button';
import FeedCommentButton from '@/app/components/social/feed-comment-button';
import { VoteSummaryProvider } from '@/app/components/social/vote-summary-context';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { FavoritesProvider } from '@/app/components/climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '@/app/components/climb-actions/playlists-batch-context';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { getBoardDetailsForPlaylist, getDefaultAngleForBoard, getUserBoardDetails } from '@/app/lib/board-config-for-playlist';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  UPDATE_INFERRED_SESSION,
  ADD_USER_TO_SESSION,
  REMOVE_USER_FROM_SESSION,
} from '@/app/lib/graphql/operations/activity-feed';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { themeTokens } from '@/app/theme/theme-config';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { Climb, BoardDetails, BoardName } from '@/app/lib/types';
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

function getStatusColor(status: string): 'success' | 'primary' | 'default' {
  if (status === 'flash') return 'success';
  if (status === 'send') return 'primary';
  return 'default';
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatAttemptText(tick: SessionDetailTick): string | null {
  if (tick.status === 'flash') return null;

  const sessionAttempts = tick.attemptCount;
  const total = tick.totalAttempts;

  if (tick.status === 'send') {
    const parts = [`on ${ordinalSuffix(sessionAttempts)} attempt`];
    if (total != null && total > sessionAttempts) {
      parts.push(`${total} total`);
    }
    return parts.join(', ');
  }

  // attempt status
  const parts = [`${sessionAttempts} attempt${sessionAttempts !== 1 ? 's' : ''}`];
  if (total != null && total > sessionAttempts) {
    parts.push(`${total} total`);
  }
  return parts.join(', ');
}

/**
 * Convert session ticks to deduplicated Climb objects for use with ClimbsList.
 * Keeps the first occurrence of each climbUuid and computes litUpHoldsMap from frames.
 */
function convertSessionTicksToClimbs(ticks: SessionDetailTick[]): Climb[] {
  const seen = new Map<string, Climb>();
  const order: string[] = [];

  for (const tick of ticks) {
    if (seen.has(tick.climbUuid)) continue;

    order.push(tick.climbUuid);

    let litUpHoldsMap = {};
    if (tick.frames && tick.boardType) {
      try {
        litUpHoldsMap = convertLitUpHoldsStringToMap(
          tick.frames,
          tick.boardType as BoardName,
        )[0] || {};
      } catch (err) {
        console.warn(`Failed to parse litUpHoldsMap for climb ${tick.climbUuid} (boardType: ${tick.boardType}):`, err);
      }
    }

    seen.set(tick.climbUuid, {
      uuid: tick.climbUuid,
      name: tick.climbName || 'Unknown Climb',
      frames: tick.frames || '',
      angle: tick.angle,
      difficulty: tick.difficultyName || '',
      quality_average: tick.quality != null ? String(tick.quality) : '0',
      setter_username: tick.setterUsername || '',
      litUpHoldsMap,
      description: '',
      ascensionist_count: 0,
      stars: 0,
      difficulty_error: '0',
      benchmark_difficulty: tick.isBenchmark ? tick.difficultyName || null : null,
      mirrored: tick.isMirror,
      boardType: tick.boardType,
      layoutId: tick.layoutId ?? null,
    });
  }

  return order.map((uuid) => seen.get(uuid)!);
}

/**
 * Build a map of climbUuid -> ticks for that climb, preserving order.
 */
function groupTicksByClimbUuid(ticks: SessionDetailTick[]): Map<string, SessionDetailTick[]> {
  const map = new Map<string, SessionDetailTick[]>();
  for (const tick of ticks) {
    const existing = map.get(tick.climbUuid);
    if (existing) {
      existing.push(tick);
    } else {
      map.set(tick.climbUuid, [tick]);
    }
  }
  return map;
}

export default function SessionDetailContent({ session: initialSession }: SessionDetailContentProps) {
  const { data: authSession } = useSession();
  const { token: authToken } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const router = useRouter();

  const [session, setSession] = useState(initialSession);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const { boards: myBoards } = useMyBoards(true);

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

  // Build a lookup from userId to participant info (memoized to avoid recreating on every render)
  const participantMap = useMemo(() => {
    const map = new Map<string, SessionFeedParticipant>();
    for (const p of participants) {
      map.set(p.userId, p);
    }
    return map;
  }, [participants]);

  // Use the actual owner from the backend
  const ownerUserId = session.ownerUserId ?? null;

  // Convert ticks to Climb objects for ClimbsList
  const sessionClimbs = useMemo(() => convertSessionTicksToClimbs(ticks), [ticks]);

  // Group ticks by climb for rendering tick details below each climb
  const ticksByClimb = useMemo(() => groupTicksByClimbUuid(ticks), [ticks]);

  // Collect tick UUIDs for batch vote summary fetching
  const tickUuids = useMemo(() => ticks.map((t) => t.uuid), [ticks]);

  // Build boardDetailsMap for multi-board support
  const { boardDetailsMap, defaultBoardDetails, unsupportedClimbs } = useMemo(() => {
    const map: Record<string, BoardDetails> = {};
    const unsupported = new Set<string>();

    const userBoardsByKey = new Map<string, UserBoard>();
    for (const board of myBoards) {
      const key = `${board.boardType}:${board.layoutId}`;
      if (!userBoardsByKey.has(key)) {
        userBoardsByKey.set(key, board);
      }
    }

    for (const climb of sessionClimbs) {
      const bt = climb.boardType;
      const layoutId = climb.layoutId;
      if (!bt || layoutId == null) continue;

      const key = `${bt}:${layoutId}`;
      if (map[key]) continue;

      const userBoard = userBoardsByKey.get(key);
      if (userBoard) {
        const details = getUserBoardDetails(userBoard);
        if (details) {
          map[key] = details;
          continue;
        }
      }

      const genericDetails = getBoardDetailsForPlaylist(bt, layoutId);
      if (genericDetails) {
        map[key] = genericDetails;
      }
    }

    const userBoardTypes = new Set(myBoards.map((b) => b.boardType));
    for (const climb of sessionClimbs) {
      if (climb.boardType && !userBoardTypes.has(climb.boardType)) {
        unsupported.add(climb.uuid);
      }
    }

    let defaultDetails: BoardDetails | null = null;
    if (myBoards.length > 0) {
      defaultDetails = getUserBoardDetails(myBoards[0]);
    }
    if (!defaultDetails && boardTypes[0]) {
      defaultDetails = getBoardDetailsForPlaylist(boardTypes[0], null);
    }

    return { boardDetailsMap: map, defaultBoardDetails: defaultDetails, unsupportedClimbs: unsupported };
  }, [sessionClimbs, myBoards, boardTypes]);

  // Climb actions data for favorites/playlists — derive from actual climb data, fall back to session metadata
  const climbUuids = useMemo(() => sessionClimbs.map((c) => c.uuid), [sessionClimbs]);
  const firstClimb = sessionClimbs[0];
  const actionsBoardName = firstClimb?.boardType || boardTypes[0] || '';
  const actionsLayoutId = firstClimb?.layoutId ?? 1;
  const actionsAngle = firstClimb?.angle ?? getDefaultAngleForBoard(actionsBoardName);

  const { favoritesProviderProps, playlistsProviderProps } = useClimbActionsData({
    boardName: actionsBoardName,
    layoutId: actionsLayoutId,
    angle: actionsAngle,
    climbUuids,
  });

  // Navigate to climb detail page using client-side routing
  const navigateToClimb = useCallback(async (climb: Climb) => {
    try {
      const bt = climb.boardType;
      if (!bt) return;
      const params = new URLSearchParams({ boardType: bt, climbUuid: climb.uuid });
      const res = await fetch(`/api/internal/climb-redirect?${params}`);
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) router.push(url);
    } catch (error) {
      console.error('Failed to navigate to climb:', error);
    }
  }, [router]);

  // Render tick details below each climb item (per-user rows for multi-user, status/attempts for single-user)
  const renderTickDetails = useCallback((climb: Climb) => {
    const climbTicks = ticksByClimb.get(climb.uuid);
    if (!climbTicks || climbTicks.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 2, pb: 1 }}>
        {climbTicks.map((tick) => {
          const participant = isMultiUser ? participantMap.get(tick.userId) : null;
          const attemptText = formatAttemptText(tick);
          return (
            <Box
              key={tick.uuid}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                py: 0.25,
                borderTop: `1px solid ${themeTokens.neutral[100]}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {isMultiUser && (
                  <>
                    <Avatar
                      src={participant?.avatarUrl ?? undefined}
                      sx={{ width: 18, height: 18 }}
                    >
                      {!participant?.avatarUrl && <PersonOutlined sx={{ fontSize: 10 }} />}
                    </Avatar>
                    <Typography variant="caption" sx={{ minWidth: 0 }} noWrap>
                      {participant?.displayName || 'Climber'}
                    </Typography>
                  </>
                )}
                <Chip
                  label={tick.status}
                  size="small"
                  color={getStatusColor(tick.status)}
                  variant={tick.status === 'attempt' ? 'outlined' : 'filled'}
                  sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: themeTokens.typography.fontSize.xs - 1 } }}
                />
                {attemptText && (
                  <Typography variant="caption" color="text.secondary">
                    {attemptText}
                  </Typography>
                )}
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <VoteButton
                    entityType="tick"
                    entityId={tick.uuid}
                    initialUpvotes={tick.upvotes}
                    likeOnly
                  />
                  <FeedCommentButton entityType="tick" entityId={tick.uuid} />
                </Box>
              </Box>
              {tick.comment && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: isMultiUser ? 3.5 : 0, minWidth: 0 }} noWrap>
                  {tick.comment}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }, [ticksByClimb, participantMap, isMultiUser]);

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

  const noopLoadMore = useCallback(() => {}, []);

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
            likeOnly
          />
          <FeedCommentButton
            entityType="session"
            entityId={sessionId}
            commentCount={commentCount}
            defaultExpanded
          />
        </Box>

        <Divider />

        {/* Climbs list */}
        <Typography variant="subtitle1" fontWeight={600}>
          Climbs ({sessionClimbs.length})
        </Typography>
      </Box>

      {defaultBoardDetails && sessionClimbs.length > 0 && (
        <VoteSummaryProvider entityType="tick" entityIds={tickUuids}>
          <FavoritesProvider {...favoritesProviderProps}>
            <PlaylistsProvider {...playlistsProviderProps}>
              <ClimbsList
                boardDetails={defaultBoardDetails}
                boardDetailsMap={boardDetailsMap}
                unsupportedClimbs={unsupportedClimbs}
                climbs={sessionClimbs}
                isFetching={false}
                hasMore={false}
                onClimbSelect={navigateToClimb}
                onLoadMore={noopLoadMore}
                hideEndMessage
                showBottomSpacer
                renderItemExtra={renderTickDetails}
              />
            </PlaylistsProvider>
          </FavoritesProvider>
        </VoteSummaryProvider>
      )}

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
