'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import type { SocialEntityType } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  ADD_COMMENT,
  type AddCommentMutationVariables,
  type AddCommentMutationResponse,
} from '@/app/lib/graphql/operations';
import CommentForm from './comment-form';
import CommentList from './comment-list';

interface CommentSectionProps {
  entityType: SocialEntityType;
  entityId: string;
  title?: string;
}

export default function CommentSection({ entityType, entityId, title = 'Discussion' }: CommentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleAddComment = useCallback(
    async (body: string) => {
      if (!token) return;
      try {
        const client = createGraphQLHttpClient(token);
        await client.request<AddCommentMutationResponse, AddCommentMutationVariables>(
          ADD_COMMENT,
          { input: { entityType, entityId, body } },
        );
        setRefreshKey((prev) => prev + 1);
      } catch {
        showMessage('Failed to post comment', 'error');
        throw new Error('Failed to post comment');
      }
    },
    [token, entityType, entityId, showMessage],
  );

  return (
    <Box>
      <MuiTypography variant="h6" sx={{ mb: 2 }}>
        {title}
      </MuiTypography>

      {isAuthenticated ? (
        <Box sx={{ mb: 2 }}>
          <CommentForm onSubmit={handleAddComment} placeholder="Share your thoughts..." />
        </Box>
      ) : (
        <MuiTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in to leave a comment.
        </MuiTypography>
      )}

      <CommentList entityType={entityType} entityId={entityId} refreshKey={refreshKey} />
    </Box>
  );
}
