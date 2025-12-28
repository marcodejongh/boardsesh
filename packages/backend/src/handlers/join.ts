import type { IncomingMessage, ServerResponse } from 'http';
import { applyCorsHeaders } from './cors.js';
import { roomManager } from '../services/room-manager.js';

/**
 * Session join redirect handler
 * GET /join/:sessionId
 *
 * Redirects to the board page with the session ID and backend URL
 */
export async function handleSessionJoin(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  port: number,
  boardseshUrl: string,
): Promise<void> {
  if (!applyCorsHeaders(req, res)) return;

  if (!sessionId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session ID is required' }));
    return;
  }

  const sessionInfo = await roomManager.getSessionById(sessionId);
  if (!sessionInfo) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  // Construct the backend WebSocket URL from the request host
  const host = req.headers.host || `localhost:${port}`;
  const backendUrl = `ws://${host}/graphql`;
  const redirectUrl = `${boardseshUrl}${sessionInfo.boardPath}?backendUrl=${encodeURIComponent(backendUrl)}&sessionId=${encodeURIComponent(sessionId)}`;

  res.writeHead(302, { Location: redirectUrl });
  res.end();
}
