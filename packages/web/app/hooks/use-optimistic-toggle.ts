'use client';

import { useState, useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';

interface UseOptimisticToggleOptions {
  initialState: boolean;
  /** GraphQL mutation to execute when toggling ON */
  onMutation: string;
  /** GraphQL mutation to execute when toggling OFF */
  offMutation: string;
  /** Build variables for the ON mutation */
  onVariables: () => Record<string, unknown>;
  /** Build variables for the OFF mutation */
  offVariables: () => Record<string, unknown>;
  /** Snackbar message shown when not authenticated */
  unauthenticatedMessage: string;
  /** Snackbar message shown on error */
  errorMessage: string;
  /** Called after optimistic update with the new state */
  onChange?: (newState: boolean) => void;
}

interface UseOptimisticToggleReturn {
  isActive: boolean;
  isLoading: boolean;
  isHovered: boolean;
  isAuthenticated: boolean;
  setIsHovered: (hovered: boolean) => void;
  handleToggle: () => Promise<void>;
}

export function useOptimisticToggle({
  initialState,
  onMutation,
  offMutation,
  onVariables,
  offVariables,
  unauthenticatedMessage,
  errorMessage,
  onChange,
}: UseOptimisticToggleOptions): UseOptimisticToggleReturn {
  const [isActive, setIsActive] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated || !token) {
      showMessage(unauthenticatedMessage, 'info');
      return;
    }

    const previousState = isActive;
    setIsActive(!isActive);
    onChange?.(!isActive);
    setIsLoading(true);

    try {
      const client = createGraphQLHttpClient(token);

      if (previousState) {
        await client.request(offMutation, offVariables());
      } else {
        await client.request(onMutation, onVariables());
      }
    } catch (error) {
      setIsActive(previousState);
      onChange?.(previousState);
      showMessage(errorMessage, 'error');
      console.error('Toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isActive,
    isAuthenticated,
    token,
    onMutation,
    offMutation,
    onVariables,
    offVariables,
    unauthenticatedMessage,
    errorMessage,
    onChange,
    showMessage,
  ]);

  return {
    isActive,
    isLoading,
    isHovered,
    isAuthenticated,
    setIsHovered,
    handleToggle,
  };
}
