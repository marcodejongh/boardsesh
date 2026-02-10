'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { VOTE_ON_PROPOSAL, RESOLVE_PROPOSAL } from '@/app/lib/graphql/operations/proposals';
import type { Proposal } from '@boardsesh/shared-schema';
import ProposalVoteBar from './proposal-vote-bar';

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
}

export default function ProposalCard({ proposal, isAdminOrLeader, onUpdate }: ProposalCardProps) {
  const { token } = useWsAuthToken();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [localProposal, setLocalProposal] = useState(proposal);

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

  const typeColor = TYPE_COLORS[localProposal.type] || themeTokens.neutral[500];

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 1.5,
          borderColor: themeTokens.neutral[200],
          '&:hover': { borderColor: themeTokens.neutral[300] },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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

          {/* Timestamp */}
          <Typography variant="caption" sx={{ color: themeTokens.neutral[400], mt: 1, display: 'block' }}>
            {new Date(localProposal.createdAt).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </>
  );
}
