import { useMemo, useCallback, useRef } from 'react';
import { useSnackbar } from '../../providers/snackbar-provider';
import type { ConnectionState } from '../../connection-manager/websocket-connection-manager';

interface UseMutationGuardParams {
  sessionId: string | null;
  backendUrl: string | null;
  hasConnected: boolean;
  connectionState: ConnectionState;
  isSessionActive: boolean;
  isSessionReady: boolean;
}

/**
 * Determines view-only mode and provides a guard function that blocks
 * mutations when the session is not ready (e.g. still connecting or
 * temporarily disconnected). Shows a debounced toast when blocked.
 */
export function useMutationGuard({
  sessionId,
  backendUrl,
  hasConnected,
  connectionState,
  isSessionActive,
  isSessionReady,
}: UseMutationGuardParams) {
  const { showMessage } = useSnackbar();

  // View-only while still connecting; once connected everyone can modify the queue
  // If no session is active, not view-only (local mode)
  const viewOnlyMode = useMemo(() => {
    if (!sessionId) return false;
    if (!backendUrl) return false;
    if (!hasConnected) return true;
    return connectionState !== 'connected';
  }, [sessionId, backendUrl, hasConnected, connectionState]);

  const canMutate = !viewOnlyMode && (sessionId ? isSessionReady : true);

  // Ref to debounce the "blocked" toast so rapid taps don't spam
  const lastBlockedToastRef = useRef(0);

  const guardMutation = useCallback((): boolean => {
    if (!sessionId || canMutate) return false;
    const now = Date.now();
    if (now - lastBlockedToastRef.current > 3000) {
      showMessage('Reconnecting to session — try again in a moment.', 'warning');
      lastBlockedToastRef.current = now;
    }
    return true;
  }, [sessionId, canMutate, showMessage]);

  return { viewOnlyMode, canMutate, guardMutation };
}
