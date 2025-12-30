import type { ConnectionContext } from '@boardsesh/shared-schema';
import { roomManager, type DiscoverableSession } from '../../../services/room-manager.js';
import { validateInput } from '../shared/helpers.js';
import { SessionIdSchema, LatitudeSchema, LongitudeSchema, RadiusMetersSchema } from '../../../validation/schemas.js';

export const sessionQueries = {
  /**
   * Get a session by ID
   * Returns session info including users and queue state
   */
  session: async (_: unknown, { sessionId }: { sessionId: string }) => {
    // Validate session ID
    validateInput(SessionIdSchema, sessionId, 'sessionId');

    const users = roomManager.getSessionUsers(sessionId);
    if (users.length === 0) return null;

    const queueState = await roomManager.getQueueState(sessionId);
    const sessionInfo = await roomManager.getSessionById(sessionId);

    return {
      id: sessionId,
      boardPath: sessionInfo?.boardPath || '',
      users,
      queueState,
      // These need connection context, but for Query we return defaults
      isLeader: false,
      clientId: '',
    };
  },

  /**
   * Find nearby sessions using GPS coordinates
   * Returns discoverable sessions within the specified radius
   */
  nearbySessions: async (
    _: unknown,
    { latitude, longitude, radiusMeters }: { latitude: number; longitude: number; radiusMeters?: number }
  ): Promise<DiscoverableSession[]> => {
    // Validate GPS coordinates
    validateInput(LatitudeSchema, latitude, 'latitude');
    validateInput(LongitudeSchema, longitude, 'longitude');
    if (radiusMeters !== undefined) {
      validateInput(RadiusMetersSchema, radiusMeters, 'radiusMeters');
    }
    return roomManager.findNearbySessions(latitude, longitude, radiusMeters || undefined);
  },

  /**
   * Get sessions created by the authenticated user
   * Returns empty array if user is not authenticated
   */
  mySessions: async (_: unknown, __: unknown, ctx: ConnectionContext): Promise<DiscoverableSession[]> => {
    // For now, we use userId from context if available
    // In production, this should use authenticated user ID
    if (!ctx.userId) {
      return [];
    }

    const sessions = await roomManager.getUserSessions(ctx.userId);

    // Convert Session to DiscoverableSession format
    return sessions.map((s) => ({
      id: s.id,
      name: s.name,
      boardPath: s.boardPath,
      latitude: s.latitude || 0,
      longitude: s.longitude || 0,
      createdAt: s.createdAt,
      createdByUserId: s.createdByUserId,
      participantCount: roomManager.getSessionClients(s.id).length,
      distance: 0, // Not applicable for own sessions
      isActive: true, // User's own sessions are always considered active
    }));
  },
};
