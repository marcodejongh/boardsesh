'use client';

import React, { useEffect, useMemo } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { usePersistentSession } from './persistent-session-context';
import { BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBaseBoardPath } from '@/app/lib/url-utils';

interface BoardSessionBridgeProps {
  boardDetails: BoardDetails;
  parsedParams: ParsedBoardRouteParameters;
  children: React.ReactNode;
}

/**
 * Bridge component that connects the board layout to the persistent session.
 * This component activates the session when mounted on a board page with a session param.
 */
const BoardSessionBridge: React.FC<BoardSessionBridgeProps> = ({
  boardDetails,
  parsedParams,
  children,
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sessionIdFromUrl = searchParams.get('session');

  const { activeSession, activateSession } = usePersistentSession();

  // Compute the base board path (without /play/[uuid] or /list segments)
  // This ensures navigation between climbs doesn't trigger session reconnection
  const baseBoardPath = useMemo(() => getBaseBoardPath(pathname), [pathname]);

  // Refs to hold stable references to boardDetails and parsedParams
  // These values change reference on every render but we only need their current values
  const boardDetailsRef = React.useRef(boardDetails);
  const parsedParamsRef = React.useRef(parsedParams);
  boardDetailsRef.current = boardDetails;
  parsedParamsRef.current = parsedParams;

  // Track session IDs that failed to connect (exhausted retries or definitive error).
  // Prevents infinite reactivation loop: when PersistentSessionContext clears activeSession
  // after exhausting retries, the bridge would otherwise see the URL still has ?session=xxx
  // and call activateSession() again, restarting the entire failing cycle.
  const failedSessionIdsRef = React.useRef<Set<string>>(new Set());
  const prevSessionIdFromUrlRef = React.useRef<string | null>(null);

  // Clear failed tracking when URL session param changes (user navigated to a different session)
  useEffect(() => {
    if (sessionIdFromUrl !== prevSessionIdFromUrlRef.current) {
      if (prevSessionIdFromUrlRef.current) {
        failedSessionIdsRef.current.delete(prevSessionIdFromUrlRef.current);
      }
      prevSessionIdFromUrlRef.current = sessionIdFromUrl;
    }
  }, [sessionIdFromUrl]);

  // Detect when activeSession is cleared while URL still has session param — mark as failed
  useEffect(() => {
    if (!activeSession && sessionIdFromUrl) {
      failedSessionIdsRef.current.add(sessionIdFromUrl);
    }
  }, [activeSession, sessionIdFromUrl]);

  // Activate or update session when we have a session param and board details
  // This effect handles:
  // 1. Initial session activation when joining via shared link
  // 2. Updates when board configuration changes (e.g., angle change) while session remains active
  // Note: Navigation within the same board (e.g., swiping between climbs) should NOT trigger reconnection
  useEffect(() => {
    if (sessionIdFromUrl && boardDetailsRef.current) {
      // Don't reactivate a session that just failed — prevents infinite retry loop
      if (failedSessionIdsRef.current.has(sessionIdFromUrl)) {
        return;
      }

      // Activate session when URL has session param and either:
      // - Session ID changed
      // - Board configuration path changed (e.g., navigating to different board/layout/size/sets)
      // Note: We compare baseBoardPaths to ignore changes to angle, /play/[uuid], /list segments
      // This ensures session continuity when navigating between climbs or changing angles
      const activeSessionBasePath = activeSession?.boardPath ? getBaseBoardPath(activeSession.boardPath) : '';
      if (activeSession?.sessionId !== sessionIdFromUrl || activeSessionBasePath !== baseBoardPath) {
        // Store the full pathname (including angle and view segment like /list)
        // This allows the /join redirect to send users to the exact page with angle
        activateSession({
          sessionId: sessionIdFromUrl,
          boardPath: pathname,
          boardDetails: boardDetailsRef.current,
          parsedParams: parsedParamsRef.current,
        });
      }
    }
    // Don't deactivate when URL param is missing - only explicit endSession() should disconnect
    // The session connection persists even if URL param is temporarily removed
  }, [
    sessionIdFromUrl,
    baseBoardPath,
    pathname,
    // boardDetails and parsedParams removed - accessed via refs to prevent unnecessary reconnections
    // Their object references change on every render but the actual values don't affect session activation
    activeSession?.sessionId,
    activeSession?.boardPath,
    activateSession,
  ]);

  return <>{children}</>;
};

export default BoardSessionBridge;
