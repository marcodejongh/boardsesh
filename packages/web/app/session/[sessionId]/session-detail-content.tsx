'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { SessionDetail, SessionDetailTick, SessionFeedParticipant } from '@boardsesh/shared-schema';
import VoteButton from '@/app/components/social/vote-button';
import CommentSection from '@/app/components/social/comment-section';
import { VoteSummaryProvider } from '@/app/components/social/vote-summary-context';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { FavoritesProvider } from '@/app/components/climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '@/app/components/climb-actions/playlists-batch-context';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { useBoardDetailsMap } from '@/app/hooks/use-board-details-map';
import { getDefaultAngleForBoard } from '@/app/lib/board-config-for-playlist';
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
import type { Climb, BoardName, BoardDetails } from '@/app/lib/types';
import UserSearchDialog from './user-search-dialog';
import SessionOverviewPanel from '@/app/components/session-details/session-overview-panel';

interface SessionDetailContentProps {
  session: SessionDetail | null;
  embedded?: boolean;
  fallbackBoardDetails?: BoardDetails | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateSessionName(firstTickAt: string, boardTypes: string[]): string {
  const day = DAYS[new Date(firstTickAt).getDay()];
  const boards = boardTypes
    .map((bt) => bt.charAt(0).toUpperCase() + bt.slice(1))
    .join(' & ');
  return `${day} ${boards} Session`;
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

function SessionTickItem({
  tick,
  isMultiUser,
  participant,
}: {
  tick: SessionDetailTick;
  isMultiUser: boolean;
  participant: SessionFeedParticipant | null;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const attemptText = formatAttemptText(tick);

  return (
    <Box
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
          <IconButton
            size="small"
            onClick={() => setCommentsOpen((prev) => !prev)}
            sx={{ color: commentsOpen ? 'text.primary' : 'text.secondary' }}
          >
            <ChatBubbleOutlineOutlined fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      {tick.comment && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: isMultiUser ? 3.5 : 0, minWidth: 0 }} noWrap>
          {tick.comment}
        </Typography>
      )}
      <Collapse in={commentsOpen} unmountOnExit>
        <Box sx={{ mt: 0.5 }}>
          <CommentSection entityType="tick" entityId={tick.uuid} title="Comments" />
        </Box>
      </Collapse>
    </Box>
  );
}

export default function SessionDetailContent({
  session: initialSession,
  embedded = false,
  fallbackBoardDetails = null,
}: SessionDetailContentProps) {
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
  const [sessionCommentsOpen, setSessionCommentsOpen] = useState(false);

  const { boards: myBoards } = useMyBoards(true);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

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
  const { boardDetailsMap, defaultBoardDetails, unsupportedClimbs } = useBoardDetailsMap(
    sessionClimbs,
    myBoards,
    null,
    boardTypes,
  );
  const effectiveBoardDetails = defaultBoardDetails ?? fallbackBoardDetails;

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
          return (
            <SessionTickItem
              key={tick.uuid}
              tick={tick}
              isMultiUser={isMultiUser}
              participant={participant ?? null}
            />
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
    <Box sx={{ minHeight: embedded ? 'auto' : '100dvh', pb: embedded ? 0 : '60px', pt: embedded ? 0 : 'var(--global-header-height)' }}>
      {!embedded && (
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
      )}

      {embedded && (
        <Box sx={{ px: { xs: 1, sm: 2 }, py: 1.5, borderBottom: `1px solid ${themeTokens.neutral[200]}` }}>
          <Typography variant="h6" noWrap>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(firstTickAt)}
          </Typography>
        </Box>
      )}

      <Box sx={{ px: embedded ? { xs: 1, sm: 2 } : 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        ) : (
          <SessionOverviewPanel
            participants={participants}
            totalSends={totalSends}
            totalFlashes={totalFlashes}
            totalAttempts={totalAttempts}
            tickCount={tickCount}
            gradeDistribution={gradeDistribution}
            boardTypes={boardTypes}
            hardestGrade={hardestGrade}
            durationMinutes={durationMinutes}
            goal={goal}
            ownerUserId={ownerUserId}
            canEditParticipants={canEdit && !saving}
            onAddParticipant={() => setAddUserDialogOpen(true)}
            onRemoveParticipant={handleRemoveUser}
            removingUserId={removingUserId}
            getParticipantHref={(userId) => `/crusher/${userId}`}
          />
        )}

        {/* Session-level social */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <VoteButton
              entityType="session"
              entityId={sessionId}
              initialUpvotes={upvotes}
              initialDownvotes={downvotes}
              likeOnly
            />
            <IconButton
              size="small"
              data-testid="session-comment-toggle"
              onClick={() => setSessionCommentsOpen((prev) => !prev)}
              sx={{ color: sessionCommentsOpen ? 'text.primary' : 'text.secondary' }}
            >
              <ChatBubbleOutlineOutlined fontSize="small" />
              {commentCount > 0 && (
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ ml: 0.5, color: 'inherit', userSelect: 'none', fontSize: 12 }}
                >
                  {commentCount}
                </Typography>
              )}
            </IconButton>
          </Box>
          <Collapse in={sessionCommentsOpen} unmountOnExit>
            <CommentSection entityType="session" entityId={sessionId} title="Comments" />
          </Collapse>
        </Box>

        <Divider />

        {/* Climbs list */}
        <Typography variant="subtitle1" fontWeight={600}>
          Climbs ({sessionClimbs.length})
        </Typography>
      </Box>

      {effectiveBoardDetails && sessionClimbs.length > 0 && (
        <VoteSummaryProvider entityType="tick" entityIds={tickUuids}>
          <FavoritesProvider {...favoritesProviderProps}>
            <PlaylistsProvider {...playlistsProviderProps}>
              <ClimbsList
                boardDetails={effectiveBoardDetails}
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
