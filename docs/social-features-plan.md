# Social Features Implementation Plan

This document describes the plan for adding social features to Boardsesh: comments, votes, follows, notifications, and an activity feed.

---

## Goals

1. **Comments** on climbs within public playlists (scoped per playlist)
2. **Comments** on climbs themselves (global discussion threads, independent from playlist context)
3. **Up/downvotes** on playlist climbs, ascents in the activity feed, and comments
4. **Follow system** so users can follow other climbers
5. **Activity feed** on the home page showing ascents from followed users, top comments, and trending content -- strictly chronological
6. **Real-time notifications** via WebSocket when someone follows you, replies to your comment, or votes on your content
7. **Live comment updates** via WebSocket so screens showing comments receive new comments in real time
8. A **well-abstracted, polymorphic system** for comments and votes that works across all entity types

---

## Architecture Overview

### Design Principles

- **Polymorphic comments and votes**: A single `comments` table and a single `votes` table, each with an `entity_type` + `entity_id` discriminator. This avoids creating N separate tables per commentable/voteable entity.
- **Fan-out on read**: The activity feed is assembled at query time. No separate denormalized feed table.
- **Cursor-based pagination** for the activity feed (better for constantly-changing datasets than offset).
- **Reddit-style ranking modes**: Four sort modes available across comments, feeds, and entity lists -- New (chronological), Top (highest score), Controversial (high engagement, divisive), and Hot (recent + high velocity). See [Ranking Algorithms](#ranking-algorithms) section for implementation details.
- **Real-time via existing WebSocket infrastructure**: Notifications and live comment updates use the same graphql-ws + Redis pub/sub system as party sessions.
- **Server-side rendering** where possible for the feed. Interactive elements (vote buttons, comment forms) are client components embedded within server-rendered shells.
- **Rate limiting** on social mutations.

### Entity Type Registry

The polymorphic system uses a string enum `entity_type` to identify what's being commented on or voted on.

| `entity_type` | Represents | `entity_id` format | Comment scope |
|---|---|---|---|
| `playlist_climb` | A climb within a specific playlist | `{playlist_uuid}:{climb_uuid}` | Scoped to that playlist |
| `climb` | A climb's global discussion thread | `{climb_uuid}` | Global across all contexts |
| `tick` | A user's ascent/attempt record | tick `uuid` | Per-tick thread |
| `comment` | A comment (for voting on comments) | comment `uuid` | N/A (votes only) |

This is extensible -- new entity types (e.g. `playlist`, `session`) can be added later by extending the enum.

**Key distinction**: A climb can have comments in two independent scopes:
- `playlist_climb` with `entity_id = "{playlist_uuid}:{climb_uuid}"` -- discussion in the context of a curated playlist
- `climb` with `entity_id = "{climb_uuid}"` -- the climb's own global discussion (accessible from the climb detail view, search results, etc.)

### Ranking Algorithms

Four Reddit-style sort modes are available wherever sortable content is displayed (comments, activity feed, playlist climb lists). The `sortBy` field in GraphQL inputs accepts these values:

#### `new` (Chronological)
```sql
ORDER BY created_at DESC
```
Pure reverse-chronological. Default for comment threads and the activity feed.

#### `top` (Highest Score)
```sql
ORDER BY (upvotes - downvotes) DESC, created_at DESC
```
Ranks by net score. Ties broken by recency. Can be combined with a time window filter (`topPeriod`: `hour`, `day`, `week`, `month`, `year`, `all`) to show "top this week", "top all time", etc.

#### `controversial` (Divisive)
Uses Reddit's controversy formula. A controversial item has a high total vote count but a score close to zero (roughly equal upvotes and downvotes).

```
controversy_score = (upvotes + downvotes) ^ balance_factor
where balance_factor = min(upvotes, downvotes) / max(upvotes, downvotes) if max > 0, else 0
```

In SQL (computed in the query):
```sql
ORDER BY
  CASE WHEN GREATEST(upvotes, downvotes) = 0 THEN 0
       ELSE POWER(upvotes + downvotes, LEAST(upvotes, downvotes)::float / GREATEST(upvotes, downvotes))
  END DESC,
  created_at DESC
```

Items with very few votes naturally score low. Items with many votes that are evenly split score highest.

#### `hot` (Trending)
Uses a time-decay formula inspired by Reddit's hot ranking. Recent items with high scores bubble up; older items decay.

```
hot_score = sign(score) * log10(max(|score|, 1)) + (created_epoch - reference_epoch) / 45000
```

Where:
- `score` = upvotes - downvotes
- `created_epoch` = Unix timestamp of creation (seconds)
- `reference_epoch` = a fixed reference point (e.g., app launch date as Unix timestamp)
- `45000` = decay constant (~12.5 hours per order of magnitude). Tunable.

In SQL:
```sql
ORDER BY
  SIGN(upvotes - downvotes) * LOG(GREATEST(ABS(upvotes - downvotes), 1))
  + EXTRACT(EPOCH FROM created_at - '2024-01-01'::timestamp) / 45000.0
  DESC
```

The `hot` sort is the default for entity discovery (e.g., "Discover playlists" could sort by hot).

#### Implementation Strategy

The ranking formulas are computed in SQL at query time using the `votes` table aggregation. For the initial implementation:

1. **Comments**: Sort computed inline via subquery that aggregates votes per comment
2. **Activity feed**: Sort computed inline on the merged result set
3. **Playlist climbs**: Sort computed via JOIN with `bulkVoteSummaries`-style aggregation

If performance becomes an issue (Phase 7), the `vote_counts` materialized table can store pre-computed `upvotes`, `downvotes`, and `score` columns, making the ranking formulas simple column references instead of aggregations.

#### GraphQL Enum

```graphql
enum SortMode {
  new           # Chronological (most recent first)
  top           # Highest net score
  controversial # High engagement, divisive (close to 50/50 split)
  hot           # Trending (recent + high vote velocity)
}

enum TimePeriod {
  hour
  day
  week
  month
  year
  all
}
```

---

## Phase 1: Database Schema (new tables)

All new tables in `packages/db/src/schema/app/`. Migrations via `npx drizzle-kit generate` from `packages/db/`.

### 1.1 `social_entity_type` Postgres Enum

Values: `'playlist_climb'`, `'climb'`, `'tick'`, `'comment'`

Used in both `comments` and `votes` tables.

### 1.2 `user_follows` table

```
packages/db/src/schema/app/follows.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `follower_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `following_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `created_at` | `timestamp` | DEFAULT now() |

**Constraints:**
- Unique index on `(follower_id, following_id)` -- can't follow the same person twice
- Check constraint: `follower_id != following_id` -- can't follow yourself

**Indexes:**
- `(follower_id)` -- "who do I follow?" queries
- `(following_id)` -- "who follows me?" / follower count queries

### 1.3 `comments` table

```
packages/db/src/schema/app/comments.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `uuid` | `text` | Unique, client-generated UUID |
| `user_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `entity_type` | `social_entity_type` | Enum value |
| `entity_id` | `text` | Composite key identifying the entity |
| `parent_comment_id` | `bigint` | Nullable, FK -> `comments.id` (for threading) |
| `body` | `text` | Comment text, max 2000 chars enforced at app layer |
| `created_at` | `timestamp` | DEFAULT now() |
| `updated_at` | `timestamp` | DEFAULT now() |
| `deleted_at` | `timestamp` | Nullable, soft delete for threaded comments |

**Indexes:**
- `(entity_type, entity_id, created_at)` -- fetch comments for an entity, ordered by time
- `(user_id, created_at)` -- "my comments" / user activity queries
- `(parent_comment_id)` -- fetch replies to a comment

**Notes:**
- Soft delete (`deleted_at`) so reply threads remain coherent. A deleted comment shows as "[deleted]" if it has replies.
- UI caps reply nesting at 1 level (flat replies, like YouTube/Reddit mobile).
- **Comments are editable in perpetuity** -- no time-based edit window. The `updated_at` column tracks edits, and the UI shows an "(edited)" indicator when `updated_at > created_at`.

### 1.4 `votes` table

```
packages/db/src/schema/app/votes.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `entity_type` | `social_entity_type` | Same enum as comments |
| `entity_id` | `text` | Same format as comments |
| `value` | `integer` | `+1` (upvote) or `-1` (downvote) |
| `created_at` | `timestamp` | DEFAULT now() |

**Constraints:**
- Unique index on `(user_id, entity_type, entity_id)` -- one vote per user per entity

**Indexes:**
- `(entity_type, entity_id)` -- aggregate vote count for an entity
- `(user_id)` -- "my votes" for fetching user's vote state in bulk

**Votes on comments:** Use `entity_type = 'comment'` with `entity_id = comment.uuid`. The votes table is fully self-referential.

### 1.5 `notifications` table

```
packages/db/src/schema/app/notifications.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `uuid` | `text` | Unique |
| `recipient_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `actor_id` | `text` | FK -> `users.id`, ON DELETE SET NULL (who triggered it) |
| `type` | `notification_type` | Enum (see below) |
| `entity_type` | `social_entity_type` | Nullable, what the notification is about |
| `entity_id` | `text` | Nullable, the specific entity |
| `comment_id` | `bigint` | Nullable, FK -> `comments.id` (for comment-related notifications) |
| `read_at` | `timestamp` | Nullable, when the user read it |
| `created_at` | `timestamp` | DEFAULT now() |

**`notification_type` enum values:**
- `new_follower` -- someone followed you
- `comment_reply` -- someone replied to your comment
- `comment_on_tick` -- someone commented on your ascent
- `vote_on_tick` -- someone voted on your ascent
- `vote_on_comment` -- someone voted on your comment

**Indexes:**
- `(recipient_id, read_at, created_at)` -- unread notifications for a user, ordered by time
- `(recipient_id, created_at)` -- all notifications for a user
- `(actor_id, recipient_id, type, entity_id)` -- deduplication check (e.g., don't send 100 vote notifications from same actor on same entity)

**Notes:**
- Notifications are persisted to DB for history (read/unread state survives disconnection).
- Real-time delivery is via WebSocket pub/sub (see Phase 5).
- Deduplication: For high-frequency events (votes), batch or deduplicate so a user doesn't get 50 notifications from 50 upvotes. Strategy: one notification per `(actor, type, entity)` tuple, updated on each new occurrence rather than inserting new rows.

### 1.6 `vote_counts` materialized table (optional, Phase 7 optimization)

If `COUNT()` becomes slow:

| Column | Type |
|---|---|
| `entity_type` | `social_entity_type` |
| `entity_id` | `text` |
| `upvotes` | `integer` |
| `downvotes` | `integer` |
| `score` | `integer` (upvotes - downvotes) |

Updated via trigger or periodic refresh. **Not needed for initial launch.**

---

## Phase 2: GraphQL Schema Extensions

Extend `packages/shared-schema/src/schema.ts`.

### 2.1 New Types

```graphql
enum SocialEntityType {
  playlist_climb
  climb
  tick
  comment
}

type Comment {
  uuid: ID!
  userId: ID!
  userDisplayName: String
  userAvatarUrl: String
  entityType: SocialEntityType!
  entityId: String!
  parentCommentId: ID
  body: String!
  createdAt: String!
  updatedAt: String!
  isEdited: Boolean!
  isDeleted: Boolean!
  # Computed fields
  replyCount: Int!
  upvotes: Int!
  downvotes: Int!
  voteScore: Int!      # upvotes - downvotes
  userVote: Int        # +1, -1, or null if not voted (requires auth)
}

type CommentConnection {
  comments: [Comment!]!
  totalCount: Int!
  hasMore: Boolean!
}

type VoteSummary {
  entityType: SocialEntityType!
  entityId: String!
  upvotes: Int!
  downvotes: Int!
  score: Int!
  userVote: Int  # +1, -1, or null
}

type FollowConnection {
  users: [PublicUserProfile!]!
  totalCount: Int!
  hasMore: Boolean!
}

type PublicUserProfile {
  id: ID!
  displayName: String
  avatarUrl: String
  followerCount: Int!
  followingCount: Int!
  isFollowedByMe: Boolean!  # requires auth
}

# --- Notifications ---

enum NotificationType {
  new_follower
  comment_reply
  comment_on_tick
  vote_on_tick
  vote_on_comment
}

type Notification {
  uuid: ID!
  type: NotificationType!
  actorId: ID
  actorDisplayName: String
  actorAvatarUrl: String
  entityType: SocialEntityType
  entityId: String
  commentBody: String       # Preview text for comment notifications
  isRead: Boolean!
  createdAt: String!
}

type NotificationConnection {
  notifications: [Notification!]!
  totalCount: Int!
  unreadCount: Int!
  hasMore: Boolean!
}

# --- Activity Feed ---

type ActivityFeedItem {
  id: ID!
  type: ActivityFeedItemType!
  timestamp: String!
  # Union-like fields (only relevant ones populated per type)
  tick: AscentFeedItem
  comment: Comment
  user: PublicUserProfile
  # Context
  entityType: SocialEntityType
  entityId: String
  voteScore: Int
  userVote: Int
}

enum ActivityFeedItemType {
  ascent          # Someone you follow logged an ascent
  comment         # A recent comment on a trending entity
  playlist_vote   # A climb in a playlist received significant votes
}

type ActivityFeedResult {
  items: [ActivityFeedItem!]!
  cursor: String  # Opaque cursor for next page
  hasMore: Boolean!
}
```

### 2.2 New Inputs

```graphql
input AddCommentInput {
  entityType: SocialEntityType!
  entityId: String!
  parentCommentId: ID
  body: String!
}

input UpdateCommentInput {
  commentUuid: ID!
  body: String!
}

input VoteInput {
  entityType: SocialEntityType!
  entityId: String!
  value: Int!  # +1 or -1; sending the same value again removes the vote
}

input CommentsInput {
  entityType: SocialEntityType!
  entityId: String!
  limit: Int
  offset: Int
  sortBy: SortMode    # new (default), top, controversial, hot
  topPeriod: TimePeriod  # Only used when sortBy=top. Defaults to 'all'
}

input ActivityFeedInput {
  cursor: String
  limit: Int         # default 20, max 50
  boardType: String  # optional filter
  sortBy: SortMode   # new (default), top, controversial, hot
  topPeriod: TimePeriod  # Only used when sortBy=top. Defaults to 'week'
}

input FollowInput {
  userId: ID!
}

input FollowListInput {
  userId: ID!
  limit: Int
  offset: Int
}

input BulkVoteSummaryInput {
  entityType: SocialEntityType!
  entityIds: [String!]!
}

input NotificationsInput {
  limit: Int
  offset: Int
  unreadOnly: Boolean
}
```

### 2.3 New Queries

```graphql
extend type Query {
  # Comments
  comments(input: CommentsInput!): CommentConnection!
  commentReplies(commentUuid: ID!, limit: Int, offset: Int): CommentConnection!

  # Votes
  voteSummary(entityType: SocialEntityType!, entityId: String!): VoteSummary!
  bulkVoteSummaries(input: BulkVoteSummaryInput!): [VoteSummary!]!

  # Follows
  followers(input: FollowListInput!): FollowConnection!
  following(input: FollowListInput!): FollowConnection!
  isFollowing(userId: ID!): Boolean!

  # User profile (public, extended)
  publicProfile(userId: ID!): PublicUserProfile

  # Notifications (requires auth)
  notifications(input: NotificationsInput): NotificationConnection!

  # Activity feed (requires auth)
  activityFeed(input: ActivityFeedInput): ActivityFeedResult!
}
```

### 2.4 New Mutations

```graphql
extend type Mutation {
  # Comments
  addComment(input: AddCommentInput!): Comment!
  updateComment(input: UpdateCommentInput!): Comment!
  deleteComment(commentUuid: ID!): Boolean!

  # Votes
  vote(input: VoteInput!): VoteSummary!

  # Follows
  followUser(input: FollowInput!): Boolean!
  unfollowUser(input: FollowInput!): Boolean!

  # Notifications
  markNotificationRead(notificationUuid: ID!): Boolean!
  markAllNotificationsRead: Boolean!
}
```

### 2.5 New Subscriptions

```graphql
extend type Subscription {
  # Real-time notifications for the authenticated user
  notificationReceived: NotificationEvent!

  # Live comment updates for an entity being viewed
  commentUpdates(entityType: SocialEntityType!, entityId: String!): CommentEvent!
}

union NotificationEvent = NotificationCreated

type NotificationCreated {
  notification: Notification!
}

union CommentEvent = CommentAdded | CommentUpdated | CommentDeleted

type CommentAdded {
  comment: Comment!
}

type CommentUpdated {
  comment: Comment!
}

type CommentDeleted {
  commentUuid: ID!
}
```

---

## Phase 3: Backend Resolvers

### 3.1 Comments Resolvers

New file: `packages/backend/src/graphql/resolvers/social/comments.ts`

**`comments` query:**
- Fetch comments for `(entity_type, entity_id)` with pagination
- JOIN `users` + `user_profiles` for `displayName`, `avatarUrl`
- Subquery for `reply_count` (COUNT of children)
- Subquery for `upvotes` and `downvotes` counts (from votes where `entity_type = 'comment'`)
- If authenticated, LEFT JOIN to get `user_vote`
- Apply ranking algorithm based on `sortBy` parameter:
  - `new`: ORDER BY `created_at DESC`
  - `top`: ORDER BY `(upvotes - downvotes) DESC`, with optional `topPeriod` time window filter on `created_at`
  - `controversial`: ORDER BY controversy formula (see Ranking Algorithms section)
  - `hot`: ORDER BY hot score formula (see Ranking Algorithms section)
- Filter out soft-deleted comments unless they have replies (show as "[deleted]")

**`addComment` mutation:**
- Auth required
- Validate `entity_type`/`entity_id` refers to a real entity:
  - `playlist_climb`: playlist exists, is public, climb exists in it
  - `climb`: climb exists in any board
  - `tick`: tick exists
- Validate `body` length (1-2000 chars)
- If `parentCommentId` provided, validate parent exists and shares the same `entity_type`/`entity_id`
- Rate limit: max 10 comments per minute per user
- Insert into `comments` table
- **Publish `CommentAdded` event** via pubsub to `comments:{entity_type}:{entity_id}` channel
- **Create notification** for entity owner (if commenting on someone else's tick) or parent comment author (if replying)
- **Publish `NotificationCreated` event** to recipient's notification channel
- Return created comment

**`updateComment` mutation:**
- Auth required, must be comment author
- **No time limit on edits** -- comments are editable in perpetuity
- Update `body` and `updated_at`
- Validate `body` length (1-2000 chars)
- **Publish `CommentUpdated` event** via pubsub
- Return updated comment

**`deleteComment` mutation:**
- Auth required, must be comment author
- If comment has replies: set `deleted_at` (soft delete), body displayed as "[deleted]"
- If comment has no replies: hard delete
- **Publish `CommentDeleted` event** via pubsub

### 3.2 Votes Resolvers

New file: `packages/backend/src/graphql/resolvers/social/votes.ts`

**`vote` mutation:**
- Auth required
- Validate `value` is +1 or -1
- Rate limit: max 30 votes per minute per user
- UPSERT logic:
  - If vote with same `(user_id, entity_type, entity_id)` exists:
    - If same value: DELETE the vote (toggle off)
    - If different value: UPDATE to new value
  - If no existing vote: INSERT
- **Create notification** for entity owner (for ticks and comments, not playlist_climb)
  - Deduplicate: don't create a new notification if one already exists for `(actor, type, entity)` within the last hour -- update the existing one's timestamp instead
- Return updated `VoteSummary`

**`voteSummary` query:**
- COUNT upvotes (`value = 1`) and downvotes (`value = -1`) for entity
- If authenticated, fetch user's vote

**`bulkVoteSummaries` query:**
- Batch version for list views (all climbs in a playlist)
- Single query with `WHERE entity_id IN (...)` and GROUP BY
- If authenticated, LEFT JOIN user's votes

### 3.3 Follows Resolvers

New file: `packages/backend/src/graphql/resolvers/social/follows.ts`

**`followUser` mutation:**
- Auth required
- Can't follow yourself (enforced at app + DB level)
- Rate limit: max 20 follows per minute per user
- INSERT into `user_follows`, ON CONFLICT DO NOTHING (idempotent)
- **Create `new_follower` notification** for the followed user
- **Publish `NotificationCreated` event** to followed user's channel

**`unfollowUser` mutation:**
- Auth required
- DELETE from `user_follows`
- No notification (unfollows are silent)

**`followers` / `following` queries:**
- Paginated list with user profile info
- Include `isFollowedByMe` if authenticated (for follow-back indication)

**`publicProfile` query:**
- Fetch user profile + follower/following counts
- `isFollowedByMe` if authenticated

### 3.4 Notifications Resolvers

New file: `packages/backend/src/graphql/resolvers/social/notifications.ts`

**`notifications` query:**
- Auth required
- Paginated, ordered by `created_at DESC`
- Optional `unreadOnly` filter
- JOIN actor profile for `displayName`, `avatarUrl`
- JOIN comment for body preview (when applicable)
- Return with `unreadCount` for badge display

**`markNotificationRead` mutation:**
- Auth required, must be recipient
- Set `read_at = now()`

**`markAllNotificationsRead` mutation:**
- Auth required
- UPDATE all unread notifications for user

### 3.5 Activity Feed Resolver

New file: `packages/backend/src/graphql/resolvers/social/feed.ts`

**`activityFeed` query:**
- Auth required
- Multi-source aggregation:

  1. **Followed-user ascents**: Query `boardsesh_ticks` WHERE `user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $me)` AND `status IN ('flash', 'send')`
  2. **Top-voted playlist climbs**: Query votes for `entity_type = 'playlist_climb'` with high scores, joined with playlist + climb data
  3. **Recent comments**: Query comments on entities with high engagement

- **Sort modes** (via `sortBy` parameter):
  - `new` (default): All items sorted by timestamp descending. Pure chronological.
  - `top`: Items ranked by net vote score. When `topPeriod` is set, only items within that time window are included (e.g., "top this week").
  - `controversial`: Items with high total votes but divisive scores. Good for discovering debated ascents or playlist picks.
  - `hot`: Items ranked by the hot formula -- recent items with high vote velocity surface first. Good default for discovery.
- **Cursor**: Encode `(sort_score, timestamp, source_type, id)` as opaque base64 cursor. Sort score varies by mode (timestamp for `new`, net score for `top`, controversy score for `controversial`, hot score for `hot`).
- **Default limit**: 20 items per page, max 50

**For unauthenticated users:**
- Show globally trending content (top-voted public playlist climbs, most-commented climbs)
- Prompt to sign in for personalized feed

---

## Phase 4: PubSub Extensions for Real-Time

Extend the existing pub/sub system in `packages/backend/src/pubsub/`.

### 4.1 New PubSub Channels

Add to `packages/backend/src/pubsub/index.ts`:

| Channel Pattern | Scope | Events |
|---|---|---|
| `boardsesh:notifications:{userId}` | Per-user | `NotificationCreated` |
| `boardsesh:comments:{entityType}:{entityId}` | Per-entity | `CommentAdded`, `CommentUpdated`, `CommentDeleted` |

New subscriber maps in PubSub class:
```typescript
private notificationSubscribers: Map<string, Set<NotificationSubscriber>> = new Map();
private commentSubscribers: Map<string, Set<CommentSubscriber>> = new Map();
```

New methods:
```typescript
subscribeNotifications(userId: string, callback: (event: NotificationEvent) => void): Promise<() => void>
publishNotificationEvent(userId: string, event: NotificationEvent): void

subscribeComments(entityType: string, entityId: string, callback: (event: CommentEvent) => void): Promise<() => void>
publishCommentEvent(entityType: string, entityId: string, event: CommentEvent): void
```

### 4.2 Redis Adapter Extensions

Add to `packages/backend/src/pubsub/redis-adapter.ts`:

- `subscribeNotificationChannel(userId)` / `unsubscribeNotificationChannel(userId)`
- `subscribeCommentChannel(entityType, entityId)` / `unsubscribeCommentChannel(...)`
- `publishNotificationEvent(userId, event)` / `publishCommentEvent(entityType, entityId, event)`

Same pattern as queue/session channels:
- Include `instanceId` in messages for duplicate prevention
- Auto-subscribe Redis channel on first local subscriber, unsubscribe on last

### 4.3 Subscription Resolvers

**`notificationReceived` subscription:**

```
packages/backend/src/graphql/resolvers/social/subscriptions.ts
```

- Auth required (`requireAuthenticated(ctx)`)
- Subscribe to `notifications:{ctx.userId}` channel
- Use lazy async iterator (no initial state push; client fetches unread count via `notifications` query separately)
- Authorization: Only the authenticated user receives their own notifications

**`commentUpdates` subscription:**

```
packages/backend/src/graphql/resolvers/social/subscriptions.ts
```

- No auth required (public entities have public comments)
- Subscribe to `comments:{entityType}:{entityId}` channel
- Use lazy async iterator
- Client subscribes when mounting a comment section component, unsubscribes on unmount
- Entity validation: verify the entity exists and is commentable (playlist is public, etc.)

### 4.4 Event Flow Examples

**New comment on a playlist climb:**
```
User A posts comment on playlist_climb "abc:xyz"
  → INSERT into comments table
  → pubsub.publishCommentEvent("playlist_climb", "abc:xyz", { __typename: "CommentAdded", comment })
    → Local subscribers notified immediately
    → Redis publishes to boardsesh:comments:playlist_climb:abc:xyz
    → Other instances receive and notify their local subscribers
  → INSERT notification for playlist owner (if different user)
  → pubsub.publishNotificationEvent(ownerUserId, { __typename: "NotificationCreated", notification })
    → Owner receives real-time notification
```

**Someone follows you:**
```
User A follows User B
  → INSERT into user_follows
  → INSERT notification (type: new_follower, recipient: B, actor: A)
  → pubsub.publishNotificationEvent(B.id, { __typename: "NotificationCreated", notification })
    → User B sees notification in real time (badge increments, toast appears)
```

---

## Phase 5: Frontend Components

### 5.1 Component Hierarchy

```
packages/web/app/components/social/
  vote-button.tsx           # Client component: upvote/downvote toggle
  vote-summary.tsx          # Display score with up/down counts
  comment-list.tsx          # Renders comment list with live updates
  comment-item.tsx          # Single comment with vote, reply, edit, delete actions
  comment-form.tsx          # Client component: textarea + submit
  comment-section.tsx       # Combines comment-list + comment-form + subscription
  follow-button.tsx         # Client component: follow/unfollow toggle
  follower-count.tsx        # Display follower/following counts
  notification-bell.tsx     # Client component: bell icon with unread badge
  notification-list.tsx     # Dropdown/drawer list of notifications

packages/web/app/components/activity-feed/
  activity-feed.tsx         # Server component: main feed container
  feed-item.tsx             # Renders one feed item based on type
  feed-item-ascent.tsx      # Ascent card (reuses existing grouped ascent UI)
  feed-item-comment.tsx     # Comment highlight card
  feed-item-playlist.tsx    # Trending playlist climb card
```

### 5.2 Vote Button (`vote-button.tsx`)

Client component. Renders upvote/downvote arrows with the score between them.

**Props:**
- `entityType: SocialEntityType`
- `entityId: string`
- `initialScore: number`
- `initialUserVote: number | null`

**Behavior:**
- Optimistic UI: immediately update score and arrow state on click
- Call `vote` mutation in background
- On error, revert to previous state
- Unauthenticated users see the score but clicking prompts login

**Design:**
- MUI `IconButton` with `ArrowUpward`/`ArrowDownward` icons
- Active upvote: `colors.success` (#6B9080)
- Active downvote: `colors.error` (#B8524C)
- Neutral: `neutral[400]`
- Score between arrows in `fontSize.sm` (14px), `neutral[800]`

### 5.3 Comment Section (`comment-section.tsx`)

Client component that manages a WebSocket subscription for live updates.

Used on:
- Public playlist climb detail view (entity_type: `playlist_climb`)
- Climb detail / global discussion (entity_type: `climb`)
- Ascent detail in the activity feed (entity_type: `tick`)

**Structure:**
```
[Comment count header]
[Sort toggle: New | Top | Controversial | Hot]
[Comment list]
  [Comment item]
    [Avatar] [Name] [Timestamp] [(edited) if updated_at > created_at]
    [Body text]
    [Vote button] [Reply button] [Edit button if author] [Delete button if author]
    [Replies (collapsed, "Show N replies")]
      [Reply items...]
  ...
[Load more button]
[Comment input form] (if authenticated)
```

**Live updates:**
- On mount, subscribe to `commentUpdates(entityType, entityId)`
- `CommentAdded` → prepend to list (or append depending on sort)
- `CommentUpdated` → update comment in place, show "(edited)"
- `CommentDeleted` → replace body with "[deleted]" or remove if no replies
- On unmount, unsubscribe

**Design notes:**
- One level of replies (flat, like YouTube mobile)
- `TextField` with "Post" button for comment input
- Max 2000 characters with character counter
- MUI `Avatar` with `avatarUrl`, fallback to initials
- Edit mode: inline, replaces body text with a TextField + Save/Cancel

### 5.4 Follow Button (`follow-button.tsx`)

Client component. Appears on user profile pages and in the activity feed.

**States:**
- Not following: outlined button "Follow"
- Following: filled button "Following", hover reveals "Unfollow"
- Loading: disabled with spinner

### 5.5 Notification Bell (`notification-bell.tsx`)

Client component. Lives in the app header/navigation.

**Behavior:**
- Shows bell icon with badge for unread count
- On mount, fetch `notifications(unreadOnly: true)` for count
- Subscribe to `notificationReceived` subscription
- On new notification: increment badge, optionally show toast/snackbar
- On click: open notification dropdown/drawer
- Mark notifications as read when viewed

**Notification list items:**
- "[Actor avatar] [Actor name] followed you" → links to actor's profile
- "[Actor avatar] [Actor name] replied to your comment" → links to comment in context
- "[Actor avatar] [Actor name] commented on your ascent of [climb name]" → links to tick
- "[Actor avatar] [Actor name] upvoted your [comment/ascent]" → links to entity

### 5.6 Activity Feed (`activity-feed.tsx`)

Extends the home page for authenticated users.

**Layout:**
```
[Home page]
  [Board selector (existing)]
  [Activity Feed section]
    [Feed items, strictly chronological...]
      [Ascent card: user avatar, name, climb thumbnail, grade, status, vote]
      [Comment highlight: quoted text, context link, vote]
      [Trending playlist climb: playlist name, climb info, vote count]
    [Load more / infinite scroll]
  [Empty state if no follows: "Follow climbers to see their activity here"]
```

**For unauthenticated users:**
- Show trending/popular content globally
- Prompt to sign in for personalized feed

---

## Phase 6: Integration Points

### 6.1 Playlist Detail View

Additions to the existing playlist detail:
- **Per-climb vote buttons** inline in the climb list
- **Comment section** below each climb when expanded (or slide-up drawer on mobile)
- **Sort modes** for the climb list: Position (existing manual order), New, Top, Controversial, Hot -- in addition to existing position sort
- **Vote count** badge on each climb card
- **Comment count** badge on each climb card
- Use `bulkVoteSummaries` to batch-load scores for all visible climbs

### 6.2 Climb Detail View

The climb detail page (when viewing from search results, not within a playlist):
- **Global comment section** using `entity_type = 'climb'`, `entity_id = climbUuid`
- **Vote buttons** on the climb
- This is the climb's own discussion, independent of any playlist context

### 6.3 Ascent/Tick Detail

When viewing an ascent (activity feed or user profile):
- **Vote buttons** on the ascent card
- **Comment section** below the ascent using `entity_type = 'tick'`

### 6.4 User Profile Page

Additions to `/crusher/[user_id]/`:
- **Follower/following counts** in the profile header
- **Follow button** for other users' profiles
- **Followers / Following tabs** showing user lists with follow-back buttons

### 6.5 Home Page

The home page currently redirects to a board. For authenticated users:
- Show the activity feed before/alongside the board redirect
- The feed is the new "landing experience" for returning users

### 6.6 App Navigation

- **Notification bell** in the top navigation bar
- Unread badge synced via WebSocket subscription
- Notification dropdown/drawer accessible from any page

---

## Phase 7: Data Validation and Security

### 7.1 Entity Validation

Before accepting a comment or vote, validate the entity exists:

| `entity_type` | Validation |
|---|---|
| `playlist_climb` | Playlist exists, is public, climb exists in playlist |
| `climb` | Climb exists in any board's climb table |
| `tick` | Tick exists |
| `comment` | Comment exists and is not deleted (for votes on comments) |

### 7.2 Rate Limits

| Action | Limit |
|---|---|
| `addComment` | 10 per minute per user |
| `updateComment` | 10 per minute per user |
| `vote` | 30 per minute per user |
| `followUser` | 20 per minute per user |

Implement via Redis (backend is multi-instance) using the existing rate limiter pattern, or a simple sliding window counter in Redis.

### 7.3 Content Moderation (future)

Design supports it but not in initial scope:
- `deleted_at` for removal
- Future: `reported_at` / `reported_by` columns for user reports
- Future: Admin tools built on soft-delete

### 7.4 Privacy

- Follows are public (standard for fitness apps)
- Vote totals are public; individual votes are private (only you see your own vote)
- Comments are public on public entities
- Notifications are private (only the recipient can see them)

### 7.5 Notification Deduplication

To avoid notification spam:
- **Votes**: Don't create a new notification for every vote. Use UPSERT: one notification per `(actor, type, entity)` tuple per hour. If a notification already exists, update its `created_at` instead of inserting a new row.
- **Follows**: One notification per `(actor, recipient)` -- unfollowing and re-following doesn't create a new notification if one exists within 24h.

---

## Implementation Order

### Milestone 1: Core Infrastructure (DB + types)
1. Add `social_entity_type` and `notification_type` Postgres enums
2. Create `user_follows` table + migration
3. Create `comments` table + migration
4. Create `votes` table + migration
5. Create `notifications` table + migration
6. Export types from `packages/db`
7. Add new GraphQL types to `packages/shared-schema`

### Milestone 2: Follow System
1. `followUser` / `unfollowUser` resolver mutations
2. `followers` / `following` / `isFollowing` resolver queries
3. `PublicUserProfile` resolver with follower counts + `isFollowedByMe`
4. `FollowButton` client component
5. Integration with user profile page (counts + button + follower/following tabs)

### Milestone 3: Comments and Votes
1. `addComment` / `updateComment` / `deleteComment` resolver mutations
2. `comments` / `commentReplies` resolver queries
3. `vote` mutation with toggle behavior
4. `voteSummary` / `bulkVoteSummaries` queries
5. `VoteButton` client component with optimistic UI
6. `CommentSection` component (form + list + item)
7. Integration with playlist detail view (playlist_climb comments + votes)
8. Integration with climb detail view (global climb comments)

### Milestone 4: Real-Time Comment Updates
1. Extend PubSub with comment channels (`subscribeComments`, `publishCommentEvent`)
2. Extend Redis adapter with comment channels
3. `commentUpdates` subscription resolver
4. `CommentEvent` union type resolver
5. Wire comment mutations to publish events
6. Update `CommentSection` component to subscribe and render live updates

### Milestone 5: Notifications
1. Extend PubSub with notification channels (`subscribeNotifications`, `publishNotificationEvent`)
2. Extend Redis adapter with notification channels
3. `notificationReceived` subscription resolver
4. `notifications` query resolver
5. `markNotificationRead` / `markAllNotificationsRead` mutations
6. Wire social mutations (follow, comment, vote) to create notifications
7. Notification deduplication logic
8. `NotificationBell` component (bell + badge + dropdown)
9. Integration in app navigation

### Milestone 6: Activity Feed
1. `activityFeed` query resolver with cursor-based pagination
2. Feed aggregation logic (followed-user ascents + trending content)
3. `ActivityFeed` server component
4. `FeedItem` components (ascent, comment, playlist)
5. Home page integration
6. Empty state for users with no follows

### Milestone 7: Polish and Performance
1. Bulk vote summary loading for list views
2. Rate limiting via Redis on all social mutations
3. `vote_counts` materialized table if needed
4. Notification batching/grouping in the UI (e.g. "3 people upvoted your ascent")
5. Infinite scroll for feed and comment lists
