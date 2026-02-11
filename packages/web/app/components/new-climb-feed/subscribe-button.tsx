'use client';

import { useState, useRef, useCallback } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLClient, execute, type Client } from '@/app/components/graphql-queue/graphql-client';
import {
  SUBSCRIBE_NEW_CLIMBS,
  UNSUBSCRIBE_NEW_CLIMBS,
  type SubscribeNewClimbsVariables,
  type SubscribeNewClimbsResponse,
  type UnsubscribeNewClimbsVariables,
  type UnsubscribeNewClimbsResponse,
} from '@/app/lib/graphql/operations/new-climb-feed';

interface SubscribeButtonProps {
  boardType: string;
  layoutId: number;
  isSubscribed: boolean;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
  disabled?: boolean;
}

export default function SubscribeButton({
  boardType,
  layoutId,
  isSubscribed,
  onSubscriptionChange,
  disabled,
}: SubscribeButtonProps) {
  const { token: wsAuthToken } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const clientRef = useRef<Client | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = createGraphQLClient({
        url: process.env.NEXT_PUBLIC_WS_URL!,
        authToken: wsAuthToken,
      });
    }
    return clientRef.current;
  }, [wsAuthToken]);

  const handleToggle = async () => {
    if (loading || disabled) return;
    if (!wsAuthToken) {
      showMessage('Please sign in to manage subscriptions', 'warning');
      return;
    }

    setLoading(true);
    try {
      const client = ensureClient();

      if (isSubscribed) {
        const variables: UnsubscribeNewClimbsVariables = {
          input: { boardType, layoutId },
        };
        await execute<UnsubscribeNewClimbsResponse, UnsubscribeNewClimbsVariables>(client, {
          query: UNSUBSCRIBE_NEW_CLIMBS,
          variables,
        });
        onSubscriptionChange?.(false);
        showMessage('Unsubscribed from new climbs', 'success');
      } else {
        const variables: SubscribeNewClimbsVariables = {
          input: { boardType, layoutId },
        };
        await execute<SubscribeNewClimbsResponse, SubscribeNewClimbsVariables>(client, {
          query: SUBSCRIBE_NEW_CLIMBS,
          variables,
        });
        onSubscriptionChange?.(true);
        showMessage('Subscribed to new climbs', 'success');
      }
    } catch (err) {
      console.error('Subscription toggle failed', err);
      showMessage('Could not update subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToggleButton
      value="subscribe"
      size="small"
      selected={isSubscribed}
      onChange={handleToggle}
      disabled={disabled || loading}
      sx={{ gap: 0.5, textTransform: 'none' }}
    >
      {loading ? (
        <CircularProgress size={16} />
      ) : isSubscribed ? (
        <NotificationsActiveOutlined fontSize="small" />
      ) : (
        <NotificationsNoneOutlined fontSize="small" />
      )}
      {isSubscribed ? 'Subscribed' : 'Subscribe'}
    </ToggleButton>
  );
}
