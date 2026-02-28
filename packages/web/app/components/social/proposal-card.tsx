'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { VOTE_ON_PROPOSAL, RESOLVE_PROPOSAL, DELETE_PROPOSAL } from '@/app/lib/graphql/operations/proposals';
import type { Proposal } from '@boardsesh/shared-schema';
import type { Climb, BoardDetails, BoardName } from '@/app/lib/types';
import ClimbListItem from '@/app/components/climb-card/climb-list-item';
import { useOptionalQueueContext } from '@/app/components/graphql-queue';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getDefaultBoardConfig } from '@/app/lib/default-board-configs';
import ProposalVoteBar from './proposal-vote-bar';
import CommentSection from './comment-section';

const TYPE_LABELS: Record<string, string> = {
  grade: 'Grade',
  classic: 'Classic',
  benchmark: 'Benchmark',
};

const TYPE_COLORS: Record<string, string> = {
  grade: themeTokens.colors.primary,
  classic: themeTokens.colors.amber,
  benchmark: themeTokens.colors.purple,
};

interface ProposalCardProps {
  proposal: Proposal;
  isAdminOrLeader?: boolean;
  onUpdate?: (updated: Proposal) => void;
  onDelete?: (proposalUuid: string) => void;
  highlight?: boolean;
}

export default function ProposalCard({ proposal, isAdminOrLeader, onUpdate, onDelete, highlight }: ProposalCardProps) {
  const { token } = useWsAuthToken();
  const queueContext = useOptionalQueueContext();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [localProposal, setLocalProposal] = useState(proposal);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

  const handleVote = useCallback(async (value: number) => {
    if (!token) {
      setSnackbar('Sign in to vote on proposals');
      return;
    }
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ voteOnProposal: Proposal }>(VOTE_ON_PROPOSAL, {
        input: { proposalUuid: localProposal.uuid, value },
      });
      setLocalProposal(result.voteOnProposal);
      onUpdate?.(result.voteOnProposal);
    } catch (err) {
      setSnackbar('Failed to vote');
    } finally {
      setLoading(false);
    }
  }, [token, localProposal.uuid, onUpdate]);

  const handleResolve = useCallback(async (status: 'approved' | 'rejected') => {
    if (!token) return;
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ resolveProposal: Proposal }>(RESOLVE_PROPOSAL, {
        input: { proposalUuid: localProposal.uuid, status },
      });
      setLocalProposal(result.resolveProposal);
      onUpdate?.(result.resolveProposal);
    } catch (err) {
      setSnackbar('Failed to resolve proposal');
    } finally {
      setLoading(false);
    }
  }, [token, localProposal.uuid, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      await client.request<{ deleteProposal: boolean }>(DELETE_PROPOSAL, {
        input: { proposalUuid: localProposal.uuid },
      });
      setShowDeleteDialog(false);
      onDelete?.(localProposal.uuid);
    } catch {
      setSnackbar('Failed to delete proposal');
    } finally {
      setLoading(false);
    }
  }, [token, localProposal.uuid, onDelete]);

  const climbAndBoardDetails = useMemo(() => {
    const { climbUuid, climbName, frames, layoutId, boardType, angle } = localProposal;
    if (!climbName && !frames) return null;
    if (!layoutId || !boardType || angle == null) return null;

    const boardName = boardType as BoardName;
    const config = getDefaultBoardConfig(boardName, layoutId);
    if (!config) return null;

    let boardDetails: BoardDetails;
    try {
      boardDetails = getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
    } catch {
      return null;
    }

    const litUpHoldsMap = frames
      ? convertLitUpHoldsStringToMap(frames, boardName)[0]
      : {};

    const climb: Climb = {
      uuid: climbUuid,
      name: climbName || '',
      setter_username: localProposal.climbSetterUsername || '',
      description: '',
      frames: frames || '',
      angle,
      ascensionist_count: localProposal.climbAscensionistCount ?? 0,
      difficulty: localProposal.climbDifficulty || '',
      quality_average: localProposal.climbQualityAverage || '0',
      stars: 0,
      difficulty_error: localProposal.climbDifficultyError || '0',
      litUpHoldsMap,
      benchmark_difficulty: localProposal.climbBenchmarkDifficulty || null,
      layoutId,
      boardType,
    };

    return { climb, boardDetails };
  }, [localProposal]);

  const handleSetActive = useCallback(() => {
    if (climbAndBoardDetails && queueContext) {
      queueContext.setCurrentClimb(climbAndBoardDetails.climb);
    }
  }, [climbAndBoardDetails, queueContext]);

  const typeColor = TYPE_COLORS[localProposal.type] || themeTokens.neutral[500];

  return (
    <>
      <Card
        ref={cardRef}
        variant="outlined"
        data-testid="proposal-card"
        sx={{
          mb: 1.5,
          borderColor: highlight ? themeTokens.colors.primary : themeTokens.neutral[200],
          boxShadow: highlight ? `0 0 0 1px ${themeTokens.colors.primary}` : undefined,
          '&:hover': { borderColor: themeTokens.neutral[300] },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Climb preview */}
          {climbAndBoardDetails && (
            <ClimbListItem
              climb={climbAndBoardDetails.climb}
              boardDetails={climbAndBoardDetails.boardDetails}
              onSelect={queueContext ? handleSetActive : undefined}
            />
          )}

          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Avatar
              src={localProposal.proposerAvatarUrl || undefined}
              sx={{ width: 28, height: 28, fontSize: 14 }}
            >
              {localProposal.proposerDisplayName?.[0] || 'U'}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
              {localProposal.proposerDisplayName || 'User'}
            </Typography>
            <Chip
              label={TYPE_LABELS[localProposal.type] || localProposal.type}
              size="small"
              sx={{
                bgcolor: `${typeColor}14`,
                color: typeColor,
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          </Box>

          {/* Value change */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Chip
              label={localProposal.currentValue}
              size="small"
              variant="outlined"
              sx={{ fontSize: 13 }}
            />
            <ArrowForwardIcon sx={{ fontSize: 16, color: themeTokens.neutral[400] }} />
            <Chip
              label={localProposal.proposedValue}
              size="small"
              sx={{
                bgcolor: themeTokens.colors.primary,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
              }}
            />
          </Box>

          {/* Reason */}
          {localProposal.reason && (
            <Typography variant="body2" sx={{ color: themeTokens.neutral[600], mb: 1.5, fontStyle: 'italic' }}>
              &ldquo;{localProposal.reason}&rdquo;
            </Typography>
          )}

          {/* Vote bar */}
          <ProposalVoteBar
            weightedUpvotes={localProposal.weightedUpvotes}
            weightedDownvotes={localProposal.weightedDownvotes}
            requiredUpvotes={localProposal.requiredUpvotes}
            status={localProposal.status}
          />

          {/* Vote buttons + admin actions */}
          {localProposal.status === 'open' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Tooltip title="Support">
                <IconButton
                  size="small"
                  disabled={loading}
                  onClick={() => handleVote(1)}
                  sx={{
                    color: localProposal.userVote === 1 ? themeTokens.colors.success : themeTokens.neutral[400],
                  }}
                >
                  {localProposal.userVote === 1 ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Oppose">
                <IconButton
                  size="small"
                  disabled={loading}
                  onClick={() => handleVote(-1)}
                  sx={{
                    color: localProposal.userVote === -1 ? themeTokens.colors.error : themeTokens.neutral[400],
                  }}
                >
                  {localProposal.userVote === -1 ? <ThumbDownIcon fontSize="small" /> : <ThumbDownOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              {isAdminOrLeader && (
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CheckIcon />}
                    disabled={loading}
                    onClick={() => handleResolve('approved')}
                    sx={{
                      color: themeTokens.colors.success,
                      borderColor: themeTokens.colors.success,
                      fontSize: 12,
                      textTransform: 'none',
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloseIcon />}
                    disabled={loading}
                    onClick={() => handleResolve('rejected')}
                    sx={{
                      color: themeTokens.colors.error,
                      borderColor: themeTokens.colors.error,
                      fontSize: 12,
                      textTransform: 'none',
                    }}
                  >
                    Reject
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Admin delete for accepted proposals */}
          {isAdminOrLeader && localProposal.status === 'approved' && (
            <Box sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DeleteIcon />}
                disabled={loading}
                onClick={() => setShowDeleteDialog(true)}
                sx={{
                  color: themeTokens.colors.error,
                  borderColor: themeTokens.colors.error,
                  fontSize: 12,
                  textTransform: 'none',
                }}
              >
                Delete Proposal
              </Button>
            </Box>
          )}

          {/* Comments toggle */}
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={() => setShowComments((prev) => !prev)}
            sx={{
              mt: 1.5,
              color: themeTokens.neutral[500],
              textTransform: 'none',
              fontSize: 12,
            }}
          >
            Comments
          </Button>

          <Collapse in={showComments} unmountOnExit>
            <Box sx={{ mt: 1 }}>
              <CommentSection entityType="proposal" entityId={localProposal.uuid} title="Comments" />
            </Box>
          </Collapse>

          {/* Timestamp */}
          <Typography variant="caption" sx={{ color: themeTokens.neutral[400], mt: 1, display: 'block' }}>
            {new Date(localProposal.createdAt).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Accepted Proposal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will revert the effects of this proposal (e.g., grade change, benchmark/classic status)
            and permanently delete it. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </>
  );
}
