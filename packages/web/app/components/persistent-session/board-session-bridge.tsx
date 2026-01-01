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
 * Extracts the base board configuration path from a full pathname.
 * This removes dynamic segments that can change during a session:
 * - /play/[climb_uuid] - viewing different climbs
 * - /list, /create - different views
 * - /{angle} - the board angle is adjustable during a session
 *
 * The base path represents the physical board setup: /{board}/{layout}/{size}/{sets}
 *
 * Examples:
 *   /kilter/original/12x12/default/45/play/abc-123 -> /kilter/original/12x12/default
 *   /kilter/original/12x12/default/45/list -> /kilter/original/12x12/default
 *   /kilter/original/12x12/default/45 -> /kilter/original/12x12/default
 *   /kilter/original/12x12/default/50 -> /kilter/original/12x12/default
 */
function getBaseBoardPath(pathname: string): string {
  // URL structure: /{board}/{layout}/{size}/{sets}/{angle}[/play/uuid|/list|/create]
  // We want to extract: /{board}/{layout}/{size}/{sets}

  // First, strip off /play/[uuid], /list, or /create if present
  let path = pathname;

  const playMatch = path.match(/^(.+?)\/play\/[^/]+$/);
  if (playMatch) {
    path = playMatch[1];
  } else {
    const listMatch = path.match(/^(.+?)\/list$/);
    if (listMatch) {
      path = listMatch[1];
    } else {
      const createMatch = path.match(/^(.+?)\/create$/);
      if (createMatch) {
        path = createMatch[1];
      }
    }
  }

  // Now strip off the angle (last segment, which is a number)
  // Path is now: /{board}/{layout}/{size}/{sets}/{angle}
  const angleMatch = path.match(/^(.+?)\/\d+$/);
  if (angleMatch) {
    return angleMatch[1];
  }

  return path;
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
