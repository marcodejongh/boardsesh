import type { SocialEvent } from '@boardsesh/shared-schema';

/**
 * Build a feed item metadata object from a SocialEvent.
 * Shared between the notification worker (Redis) and inline fallback paths.
 *
 * Pure function — no DB or IO dependencies — so it's easy to test.
 */
export function buildFeedItemMetadata(event: SocialEvent): Record<string, unknown> {
  return {
    actorDisplayName: event.metadata.actorDisplayName,
    actorAvatarUrl: event.metadata.actorAvatarUrl,
    climbName: event.metadata.climbName,
    climbUuid: event.metadata.climbUuid,
    boardType: event.metadata.boardType,
    setterUsername: event.metadata.setterUsername,
    layoutId: event.metadata.layoutId ? Number(event.metadata.layoutId) : null,
    frames: event.metadata.frames,
    gradeName: event.metadata.gradeName,
    difficulty: event.metadata.difficulty ? Number(event.metadata.difficulty) : null,
    difficultyName: event.metadata.difficultyName,
    status: event.metadata.status,
    angle: event.metadata.angle ? Number(event.metadata.angle) : null,
    isMirror: event.metadata.isMirror === 'true',
    isBenchmark: event.metadata.isBenchmark === 'true',
    quality: event.metadata.quality ? Number(event.metadata.quality) : null,
    attemptCount: event.metadata.attemptCount ? Number(event.metadata.attemptCount) : null,
    comment: event.metadata.comment,
  };
}
