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

  // Refs to hold stable references to boardDetails and parsedParams
  // These values change reference on every render but we only need their current values
  const boardDetailsRef = React.useRef(boardDetails);
  const parsedParamsRef = React.useRef(parsedParams);
  boardDetailsRef.current = boardDetails;
  parsedParamsRef.current = parsedParams;

  // Activate or update session when we have a session param and board details
  // This effect handles:
  // 1. Initial session activation when joining via shared link
  // 2. Updates when pathname changes (e.g., angle change) while session remains active
  useEffect(() => {
    if (sessionIdFromUrl && boardDetailsRef.current) {
      // Activate session when URL has session param and either:
      // - Session ID changed
      // - Board path changed (e.g., navigating to different angle)
      if (activeSession?.sessionId !== sessionIdFromUrl || activeSession?.boardPath !== pathname) {
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
