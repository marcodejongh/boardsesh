'use client';

import React, { useEffect, useMemo } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { usePersistentSession } from './persistent-session-context';
import { BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';

interface BoardSessionBridgeProps {
  boardDetails: BoardDetails;
  parsedParams: ParsedBoardRouteParameters;
  children: React.ReactNode;
}

/**
 * Extracts the base board path from a full pathname.
 * This removes dynamic segments like /play/[climb_uuid] or /list that change during navigation
 * but don't represent a change in board configuration.
 *
 * Examples:
 *   /kilter/original/12x12/default/45/play/abc-123 -> /kilter/original/12x12/default/45
 *   /kilter/original/12x12/default/45/list -> /kilter/original/12x12/default/45
 *   /kilter/original/12x12/default/45 -> /kilter/original/12x12/default/45
 */
function getBaseBoardPath(pathname: string): string {
  // Remove /play/[uuid] or /list segments from the end
  // The base board path is: /{board}/{layout}/{size}/{sets}/{angle}
  const playMatch = pathname.match(/^(.+?)\/play\/[^/]+$/);
  if (playMatch) {
    return playMatch[1];
  }

  const listMatch = pathname.match(/^(.+?)\/list$/);
  if (listMatch) {
    return listMatch[1];
  }

  const createMatch = pathname.match(/^(.+?)\/create$/);
  if (createMatch) {
    return createMatch[1];
  }

  return pathname;
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

  // Activate or update session when we have a session param and board details
  // This effect handles:
  // 1. Initial session activation when joining via shared link
  // 2. Updates when board configuration changes (e.g., angle change) while session remains active
  // Note: Navigation within the same board (e.g., swiping between climbs) should NOT trigger reconnection
  useEffect(() => {
    if (sessionIdFromUrl && boardDetailsRef.current) {
      // Activate session when URL has session param and either:
      // - Session ID changed
      // - Board configuration path changed (e.g., navigating to different angle)
      // Note: We use baseBoardPath to ignore changes to /play/[uuid] segments
      if (activeSession?.sessionId !== sessionIdFromUrl || activeSession?.boardPath !== baseBoardPath) {
        activateSession({
          sessionId: sessionIdFromUrl,
          boardPath: baseBoardPath,
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
    // boardDetails and parsedParams removed - accessed via refs to prevent unnecessary reconnections
    // Their object references change on every render but the actual values don't affect session activation
    activeSession?.sessionId,
    activeSession?.boardPath,
    activateSession,
  ]);

  return <>{children}</>;
};

export default BoardSessionBridge;
