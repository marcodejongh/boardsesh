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

  // Activate session when we have a session param and board details
  // This handles both initial session joins (via shared link) and updates when
  // board details change (e.g., angle change) while staying in the same session
  useEffect(() => {
    if (sessionIdFromUrl && boardDetails) {
      // Activate when: joining a new session OR board path changed (e.g., angle change)
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
