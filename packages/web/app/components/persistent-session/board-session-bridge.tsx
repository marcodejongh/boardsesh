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

  const { activeSession, activateSession, deactivateSession } = usePersistentSession();

  // Activate session when we have a session param and board details
  useEffect(() => {
    if (sessionIdFromUrl && boardDetails) {
      // Only activate if not already active for this session
      if (activeSession?.sessionId !== sessionIdFromUrl || activeSession?.boardPath !== pathname) {
        activateSession({
          sessionId: sessionIdFromUrl,
          boardPath: pathname,
          boardDetails,
          parsedParams,
        });
      }
    } else if (!sessionIdFromUrl && activeSession?.boardPath === pathname) {
      // If session was removed from URL while on this board, deactivate
      deactivateSession();
    }
  }, [
    sessionIdFromUrl,
    pathname,
    boardDetails,
    parsedParams,
    activeSession?.sessionId,
    activeSession?.boardPath,
    activateSession,
    deactivateSession,
  ]);

  // Update board details if they change (e.g., angle change)
  useEffect(() => {
    if (activeSession?.sessionId === sessionIdFromUrl && activeSession?.boardPath !== pathname) {
      // Board path changed but session is the same - update the session info
      activateSession({
        sessionId: sessionIdFromUrl!,
        boardPath: pathname,
        boardDetails,
        parsedParams,
      });
    }
  }, [pathname, parsedParams, boardDetails, activeSession, sessionIdFromUrl, activateSession]);

  return <>{children}</>;
};

export default BoardSessionBridge;
