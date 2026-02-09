'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MuiTypography from '@mui/material/Typography';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  VOTE,
  type VoteMutationVariables,
  type VoteMutationResponse,
} from '@/app/lib/graphql/operations';
import { themeTokens } from '@/app/theme/theme-config';
import type { SocialEntityType } from '@boardsesh/shared-schema';

interface VoteButtonProps {
  entityType: SocialEntityType;
  entityId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: number;
  layout?: 'vertical' | 'horizontal';
  onVoteChange?: (summary: { upvotes: number; downvotes: number; voteScore: number; userVote: number }) => void;
}

export default function VoteButton({
  entityType,
  entityId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = 0,
  layout = 'horizontal',
  onVoteChange,
}: VoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (!isAuthenticated || !token) {
        showMessage('Sign in to vote', 'info');
        return;
      }

      // Optimistic update
      const prevUpvotes = upvotes;
      const prevDownvotes = downvotes;
      const prevUserVote = userVote;

      let newUserVote: number;
      let newUpvotes = upvotes;
      let newDownvotes = downvotes;

      if (userVote === value) {
        // Toggle off
        newUserVote = 0;
        if (value === 1) newUpvotes--;
        else newDownvotes--;
      } else {
        // Remove previous vote if exists
        if (userVote === 1) newUpvotes--;
        if (userVote === -1) newDownvotes--;
        // Add new vote
        newUserVote = value;
        if (value === 1) newUpvotes++;
        else newDownvotes++;
      }

      setUpvotes(newUpvotes);
      setDownvotes(newDownvotes);
      setUserVote(newUserVote);
      onVoteChange?.({
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        voteScore: newUpvotes - newDownvotes,
        userVote: newUserVote,
      });

      setIsLoading(true);
      try {
        const client = createGraphQLHttpClient(token);
        const response = await client.request<VoteMutationResponse, VoteMutationVariables>(
          VOTE,
          { input: { entityType, entityId, value } },
        );

        // Use server response as source of truth
        const s = response.vote;
        setUpvotes(s.upvotes);
        setDownvotes(s.downvotes);
        setUserVote(s.userVote);
        onVoteChange?.(s);
      } catch {
        // Revert optimistic update
        setUpvotes(prevUpvotes);
        setDownvotes(prevDownvotes);
        setUserVote(prevUserVote);
        onVoteChange?.({
          upvotes: prevUpvotes,
          downvotes: prevDownvotes,
          voteScore: prevUpvotes - prevDownvotes,
          userVote: prevUserVote,
        });
        showMessage('Failed to vote', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [upvotes, downvotes, userVote, isAuthenticated, token, entityType, entityId, onVoteChange, showMessage],
  );

  const score = upvotes - downvotes;
  const isVertical = layout === 'vertical';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        gap: 0,
      }}
    >
      <IconButton
        size="small"
        onClick={() => handleVote(1)}
        disabled={isLoading}
        aria-label="Upvote"
        sx={{
          color: userVote === 1 ? themeTokens.colors.success : themeTokens.neutral[400],
          p: 0.5,
        }}
      >
        <ArrowUpwardOutlined sx={{ fontSize: 20 }} />
      </IconButton>
      <MuiTypography
        variant="body2"
        fontWeight={600}
        sx={{
          minWidth: 20,
          textAlign: 'center',
          color:
            userVote === 1
              ? themeTokens.colors.success
              : userVote === -1
                ? themeTokens.colors.error
                : themeTokens.neutral[600],
        }}
      >
        {score}
      </MuiTypography>
      <IconButton
        size="small"
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        aria-label="Downvote"
        sx={{
          color: userVote === -1 ? themeTokens.colors.error : themeTokens.neutral[400],
          p: 0.5,
        }}
      >
        <ArrowDownwardOutlined sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}
