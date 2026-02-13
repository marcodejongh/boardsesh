'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import type { Comment as CommentType, SocialEntityType, SortMode } from '@boardsesh/shared-schema';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import {
  GET_COMMENTS,
  type GetCommentsQueryVariables,
  type GetCommentsQueryResponse,
} from '@/app/lib/graphql/operations';
import CommentItem from './comment-item';

interface CommentListProps {
  entityType: SocialEntityType;
  entityId: string;
  refreshKey?: number;
  currentUserId?: string | null;
}

const PAGE_SIZE = 20;

export default function CommentList({ entityType, entityId, refreshKey = 0, currentUserId }: CommentListProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('new');
  const { token } = useWsAuthToken();

  const fetchComments = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const client = createGraphQLHttpClient(token);
        const response = await client.request<GetCommentsQueryResponse, GetCommentsQueryVariables>(
          GET_COMMENTS,
          {
            input: {
              entityType,
              entityId,
              sortBy,
              limit: PAGE_SIZE,
              offset,
            },
          },
        );

        const result = response.comments;
        if (append) {
          setComments((prev) => [...prev, ...result.comments]);
        } else {
          setComments(result.comments);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
      } catch {
        // Silently fail — empty state will show
      }
    },
    [entityType, entityId, sortBy, token],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchComments(0, false).finally(() => setIsLoading(false));
  }, [fetchComments, refreshKey]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    await fetchComments(comments.length, true);
    setIsLoadingMore(false);
  }, [fetchComments, comments.length]);

  const handleSortChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newSort: SortMode | null) => {
      if (newSort) {
        setSortBy(newSort);
      }
    },
    [],
  );

  const handleCommentUpdated = useCallback((updated: CommentType) => {
    setComments((prev) => prev.map((c) => (c.uuid === updated.uuid ? updated : c)));
  }, []);

  const handleCommentDeleted = useCallback((uuid: string) => {
    setComments((prev) => prev.filter((c) => c.uuid !== uuid));
    setTotalCount((prev) => prev - 1);
  }, []);

  // Inline IntersectionObserver — same pattern as climbs-list.tsx
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleLoadMoreRef = useRef(handleLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingMoreRef = useRef(isLoadingMore);
  handleLoadMoreRef.current = handleLoadMore;
  hasMoreRef.current = hasMore;
  isLoadingMoreRef.current = isLoadingMore;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current) {
        handleLoadMoreRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Sort controls */}
      {totalCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <MuiTypography variant="caption" color="text.secondary">
            {totalCount} {totalCount === 1 ? 'comment' : 'comments'}
          </MuiTypography>
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={handleSortChange}
            size="small"
          >
            <ToggleButton value="new" sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: 12 }}>
              New
            </ToggleButton>
            <ToggleButton value="top" sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: 12 }}>
              Top
            </ToggleButton>
            <ToggleButton value="controversial" sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: 12 }}>
              Controversial
            </ToggleButton>
            <ToggleButton value="hot" sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: 12 }}>
              Hot
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Comments */}
      {comments.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
          <ChatBubbleOutlineOutlined sx={{ fontSize: 32, color: 'var(--neutral-300)' }} />
          <MuiTypography variant="body2" color="text.secondary">
            No comments yet. Be the first!
          </MuiTypography>
        </Box>
      ) : (
        <>
          {comments.map((comment) => (
            <CommentItem
              key={comment.uuid}
              comment={comment}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              entityType={entityType}
              entityId={entityId}
              currentUserId={currentUserId}
            />
          ))}
          {hasMore && (
            <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 1, minHeight: 20 }}>
              {isLoadingMore && <CircularProgress size={16} />}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
