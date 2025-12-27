'use client';

import React, { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { usePersistentSession } from './persistent-session-context';
import { BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';

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

  // Activate or update session when we have a session param and board details
  // This effect handles:
  // 1. Initial session activation when joining via shared link
  // 2. Updates when pathname changes (e.g., angle change) while session remains active
  useEffect(() => {
    if (sessionIdFromUrl && boardDetails) {
      // Activate session when URL has session param and either:
      // - Session ID changed
      // - Board path changed (e.g., navigating to different angle)
      if (activeSession?.sessionId !== sessionIdFromUrl || activeSession?.boardPath !== pathname) {
        activateSession({
          sessionId: sessionIdFromUrl,
          boardPath: pathname,
          boardDetails,
          parsedParams,
        });
      }
    }
    // Don't deactivate when URL param is missing - only explicit endSession() should disconnect
    // The session connection persists even if URL param is temporarily removed
  }, [
    sessionIdFromUrl,
    pathname,
    boardDetails,
    parsedParams,
    activeSession?.sessionId,
    activeSession?.boardPath,
    activateSession,
  ]);

  return <>{children}</>;
};

export default BoardSessionBridge;
