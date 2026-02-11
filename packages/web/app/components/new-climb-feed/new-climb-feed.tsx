'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { Client } from '../graphql-queue/graphql-client';
import { createGraphQLClient, execute, subscribe } from '../graphql-queue/graphql-client';
import {
  GET_NEW_CLIMB_FEED,
  NEW_CLIMB_CREATED_SUBSCRIPTION,
  type GetNewClimbFeedResponse,
  type GetNewClimbFeedVariables,
  type NewClimbCreatedSubscriptionPayload,
} from '@/app/lib/graphql/operations/new-climb-feed';
import type { NewClimbFeedItem as NewClimbFeedItemType } from '@boardsesh/shared-schema';
import NewClimbFeedItem from './new-climb-feed-item';
import SubscribeButton from './subscribe-button';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';

interface NewClimbFeedProps {
  boardType: string;
  layoutId: number;
  isAuthenticated: boolean;
  isSubscribed?: boolean;
}

const PAGE_SIZE = 20;

export default function NewClimbFeed({ boardType, layoutId, isAuthenticated, isSubscribed = false }: NewClimbFeedProps) {
  const { token: wsAuthToken } = useWsAuthToken();
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<() => void>();
  const [items, setItems] = useState<NewClimbFeedItemType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [nextOffset, setNextOffset] = useState(0);

  const ensureClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = createGraphQLClient({
        url: process.env.NEXT_PUBLIC_WS_URL!,
        authToken: wsAuthToken,
      });
    }
    return clientRef.current;
  }, [wsAuthToken]);

  const fetchPage = useCallback(
    async (offset = 0, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const client = ensureClient();
        const variables: GetNewClimbFeedVariables = {
          input: { boardType, layoutId, limit: PAGE_SIZE, offset },
        };
        const res = await execute<GetNewClimbFeedResponse, GetNewClimbFeedVariables>(client, {
          query: GET_NEW_CLIMB_FEED,
          variables,
        });

        setItems((prev) => (append ? [...prev, ...res.newClimbFeed.items] : res.newClimbFeed.items));
        setTotalCount(res.newClimbFeed.totalCount);
        setHasMore(res.newClimbFeed.hasMore);
        setNextOffset(offset + res.newClimbFeed.items.length);
      } catch (err) {
        console.error('Failed to fetch new climb feed', err);
        setError('Failed to load climbs. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [boardType, layoutId, ensureClient],
  );

  // Initial load and when board/layout changes
  useEffect(() => {
    setItems([]);
    setTotalCount(0);
    setHasMore(false);
    setNextOffset(0);
    fetchPage(0, false);
  }, [boardType, layoutId, fetchPage]);

  // Re-run subscription when board/layout changes
  useEffect(() => {
    const client = ensureClient();
    if (subscriptionRef.current) {
      subscriptionRef.current();
    }
    subscriptionRef.current = subscribe<NewClimbCreatedSubscriptionPayload>(
      client,
      { query: NEW_CLIMB_CREATED_SUBSCRIPTION, variables: { boardType, layoutId } },
      {
        next: (data) => {
          const newItem = data.newClimbCreated.climb;
          setItems((prev) => {
            const exists = prev.some((i) => i.uuid === newItem.uuid);
            if (exists) return prev;
            setTotalCount((count) => count + 1);
            return [newItem, ...prev].slice(0, PAGE_SIZE);
          });
        },
        error: (err) => console.error('New climb subscription error', err),
      },
    );

    return () => {
      subscriptionRef.current?.();
      subscriptionRef.current = undefined;
    };
  }, [boardType, layoutId, ensureClient]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          New Climbs
        </Typography>
        <SubscribeButton
          boardType={boardType}
          layoutId={layoutId}
          isSubscribed={subscribed}
          disabled={!isAuthenticated}
          onSubscriptionChange={setSubscribed}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {items.map((item) => (
        <NewClimbFeedItem key={item.uuid} item={item} />
      ))}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Button variant="outlined" onClick={() => fetchPage(nextOffset, true)}>
            Load more
          </Button>
        </Box>
      )}

      {!loading && items.length === 0 && !error && (
        <Typography variant="body2" color="text.secondary">
          No climbs yet for this layout. Be the first to set one!
        </Typography>
      )}
    </Box>
  );
}
