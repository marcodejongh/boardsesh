# Social Features Implementation Plan

This document describes the plan for adding social features to Boardsesh: comments, votes, follows, and an activity feed.

---

## Goals

1. **Comments** on climbs within public playlists
2. **Up/downvotes** on playlist climbs and on ascents in the activity feed
3. **Follow system** so users can follow other climbers
4. **Activity feed** on the home page showing top comments, ascents from followed users, and voteable content
5. A **well-abstracted, polymorphic system** for comments and votes that can be extended to new entity types in the future

---

## Architecture Overview

### Design Principles

- **Polymorphic comments and votes**: A single `comments` table and a single `votes` table, each with an `entity_type` + `entity_id` discriminator. This avoids creating N separate tables for each commentable/voteable entity.
- **Fan-out on read**: The activity feed is assembled at query time by pulling from followed-user ascents, top-voted content, and recent comments. No separate denormalized feed table (keeps writes simple, avoids consistency issues).
- **Cursor-based pagination** for the activity feed (the existing `AscentFeedInput` uses offset pagination -- the feed should use cursor-based for better performance on large, constantly-changing datasets).
- **Server-side rendering** where possible for the feed. Interactive elements (vote buttons, comment forms) will be client components embedded within server-rendered feed items.
- **Rate limiting** on social mutations (comments, votes, follows) to prevent abuse.

### Entity Type Registry

The polymorphic system will use a string `entity_type` enum to identify what's being commented on or voted on. Initial types:

| `entity_type` | Represents | `entity_id` format |
|---|---|---|
| `playlist_climb` | A climb within a specific playlist | `{playlist_uuid}:{climb_uuid}` |
| `tick` | A user's ascent/attempt record | tick `uuid` |

This is extensible -- new entity types (e.g. `climb`, `playlist`, `session`) can be added later without schema changes, just a new enum value.

---

## Phase 1: Database Schema (new tables)

All new tables go in `packages/db/src/schema/app/`. Migrations generated via `npx drizzle-kit generate` from `packages/db/`.

### 1.1 `user_follows` table

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

### 1.2 `comments` table

```
packages/db/src/schema/app/comments.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `uuid` | `text` | Unique, client-generated UUID |
| `user_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `entity_type` | `text` (enum) | `'playlist_climb'` or `'tick'` |
| `entity_id` | `text` | Composite key identifying the entity |
| `parent_comment_id` | `bigint` | Nullable, FK -> `comments.id` (for threading) |
| `body` | `text` | Comment text, max 2000 chars enforced at app layer |
| `created_at` | `timestamp` | DEFAULT now() |
| `updated_at` | `timestamp` | DEFAULT now() |
| `deleted_at` | `timestamp` | Nullable, soft delete for threaded comments |

**Indexes:**
- `(entity_type, entity_id, created_at)` -- fetch comments for an entity, ordered by time
- `(user_id, created_at)` -- "my comments" / user profile queries
- `(parent_comment_id)` -- fetch replies to a comment

**Notes:**
- Soft delete (`deleted_at`) is used instead of hard delete so that reply threads remain coherent. A deleted comment shows as "[deleted]" if it has replies.
- No threading depth limit enforced at DB level, but the UI will cap reply nesting at 1 level (flat replies, like Reddit mobile).

### 1.3 `votes` table

```
packages/db/src/schema/app/votes.ts
```

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `text` | FK -> `users.id`, ON DELETE CASCADE |
| `entity_type` | `text` (enum) | Same enum as comments |
| `entity_id` | `text` | Same format as comments |
| `value` | `integer` | `+1` (upvote) or `-1` (downvote) |
| `created_at` | `timestamp` | DEFAULT now() |

**Constraints:**
- Unique index on `(user_id, entity_type, entity_id)` -- one vote per user per entity

**Indexes:**
- `(entity_type, entity_id)` -- aggregate vote count for an entity
- `(user_id)` -- "my votes" for fetching user's vote state in bulk

**Votes on comments:**
Comments themselves can also be voted on. For this, use `entity_type = 'comment'` with `entity_id = comment.uuid`. This means the votes table is fully self-referential without needing a separate "comment_votes" table.

### 1.4 Entity Type Enum

Create a Postgres enum `social_entity_type` with values: `'playlist_climb'`, `'tick'`, `'comment'`. Use the same enum in both the `comments` and `votes` tables.

### 1.5 `vote_counts` materialized view (optional, Phase 3 optimization)

If performance becomes an issue, add a materialized table:

| Column | Type |
|---|---|
| `entity_type` | text |
| `entity_id` | text |
| `upvotes` | integer |
| `downvotes` | integer |
| `score` | integer (upvotes - downvotes) |

Updated via trigger or periodic refresh. **Not needed for initial launch** -- `COUNT()` with the proper indexes will be fast enough for early usage.

---

## Phase 2: GraphQL Schema Extensions

Extend `packages/shared-schema/src/schema.ts` with new types, queries, mutations, and subscriptions.

### 2.1 New Types

```graphql
enum SocialEntityType {
  playlist_climb
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
  isDeleted: Boolean!
  # Computed fields
  replyCount: Int!
  voteScore: Int!
  userVote: Int  # +1, -1, or null if not voted (requires auth)
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
  ascent          # Someone you follow logged a tick
  comment         # A top/recent comment on a popular entity
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
  sortBy: String  # 'recent' (default) or 'top' (by vote score)
}

input ActivityFeedInput {
  cursor: String
  limit: Int  # default 20, max 50
  boardType: String  # optional filter
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
}
```

### 2.5 Subscriptions (future, not Phase 1)

Real-time comment/vote updates within a party session could use the existing WebSocket infrastructure:

```graphql
extend type Subscription {
  # New comments on an entity (useful when viewing a playlist together)
  newComment(entityType: SocialEntityType!, entityId: String!): Comment!
}
```

This is deferred to a later phase since the primary use case (public playlists) is not real-time.

---

## Phase 3: Backend Resolvers

All resolvers live in `packages/backend/src/resolvers/` (or the existing resolver structure).

### 3.1 Comments Resolvers

**`comments` query:**
- Fetch comments for `(entity_type, entity_id)` with pagination
- JOIN user profile for `displayName`, `avatarUrl`
- Subquery or window function for `reply_count`
- Subquery for `vote_score` (SUM of votes)
- If authenticated, LEFT JOIN to get `user_vote`
- Sort by `created_at` (recent) or `vote_score` (top)

**`addComment` mutation:**
- Auth required
- Validate `entity_type`/`entity_id` refers to a real entity (e.g., playlist exists, is public, climb exists in it)
- Rate limit: max 10 comments per minute per user
- Insert into `comments` table
- Return created comment

**`updateComment` mutation:**
- Auth required, must be comment author
- Update `body` and `updated_at`
- Only allowed within 15 minutes of creation (edit window)

**`deleteComment` mutation:**
- Auth required, must be comment author
- If comment has replies: set `deleted_at` (soft delete)
- If comment has no replies: hard delete

### 3.2 Votes Resolvers

**`vote` mutation:**
- Auth required
- Validate `value` is +1 or -1
- UPSERT: if vote with same `(user_id, entity_type, entity_id)` exists:
  - If same value: DELETE (toggle off)
  - If different value: UPDATE
- If no existing vote: INSERT
- Return updated `VoteSummary`

**`voteSummary` query:**
- COUNT upvotes and downvotes for entity
- If authenticated, fetch user's vote

**`bulkVoteSummaries` query:**
- Batch version for list views (e.g., all climbs in a playlist view)
- Single query with `WHERE entity_id IN (...)` and GROUP BY

### 3.3 Follows Resolvers

**`followUser` mutation:**
- Auth required
- Can't follow yourself (enforced at app + DB level)
- INSERT into `user_follows`, ignore conflict (idempotent)

**`unfollowUser` mutation:**
- Auth required
- DELETE from `user_follows`

**`followers` / `following` queries:**
- Paginated list with user profile info
- Include `isFollowedByMe` if authenticated (for follow-back indication)

### 3.4 Activity Feed Resolver

**`activityFeed` query:**
- Auth required
- Multi-source aggregation:

  1. **Followed-user ascents**: Query `boardsesh_ticks` WHERE `user_id IN (followed_user_ids)` AND `status IN ('flash', 'send')`, ordered by `climbed_at DESC`
  2. **Top-voted playlist climbs**: Query votes table for `entity_type = 'playlist_climb'` with high scores in the last 7 days, joined with playlist + climb data
  3. **Recent comments**: Query comments on entities with high engagement (many votes or replies)

- **Merge strategy**: Interleave results by timestamp, deduplicate by entity
- **Cursor**: Encode `(timestamp, source_type, id)` as opaque base64 cursor
- **Default limit**: 20 items per page

**Feed composition algorithm (simplified):**
```
1. Fetch 20 recent ascents from followed users
2. Fetch 5 top-voted playlist climbs from last 7 days
3. Fetch 5 trending comments (most replies/votes in last 24h)
4. Merge by timestamp, interleaving non-ascent items every ~4th position
5. Apply cursor filter, return first `limit` items
```

---

## Phase 4: Frontend Components

### 4.1 Component Hierarchy

```
packages/web/app/components/social/
  vote-button.tsx           # Client component: upvote/downvote toggle
  vote-summary.tsx          # Display score with up/down counts
  comment-list.tsx          # Server component: fetch & render comments
  comment-item.tsx          # Single comment with vote, reply, delete actions
  comment-form.tsx          # Client component: textarea + submit
  comment-section.tsx       # Combines comment-list + comment-form
  follow-button.tsx         # Client component: follow/unfollow toggle
  follower-count.tsx        # Display follower/following counts

packages/web/app/components/activity-feed/
  activity-feed.tsx         # Server component: main feed container
  feed-item.tsx             # Renders one feed item based on type
  feed-item-ascent.tsx      # Ascent card (reuses existing grouped ascent UI)
  feed-item-comment.tsx     # Comment highlight card
  feed-item-playlist.tsx    # Trending playlist climb card
```

### 4.2 Vote Button (`vote-button.tsx`)

Client component. Renders an upvote and downvote arrow with the current score between them.

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
- Use MUI `IconButton` with `ArrowUpward`/`ArrowDownward` icons
- Active upvote: `colors.success` (#6B9080)
- Active downvote: `colors.error` (#B8524C)
- Neutral: `neutral[400]`
- Score between arrows in `fontSize.sm` (14px), `neutral[800]`

### 4.3 Comment Section (`comment-section.tsx`)

Used on:
- Public playlist climb detail view
- Ascent detail in the activity feed

**Structure:**
```
[Comment count header]
[Sort toggle: Recent | Top]
[Comment list]
  [Comment item]
    [Avatar] [Name] [Timestamp]
    [Body text]
    [Vote button] [Reply button] [Delete button if author]
    [Replies (collapsed, "Show N replies")]
      [Reply items...]
  ...
[Load more button]
[Comment input form] (if authenticated)
```

**Design considerations:**
- Comments are flat with one level of replies (like YouTube/Reddit mobile)
- Comment form is a simple `TextField` with a "Post" button
- Max 2000 characters with character counter
- Avatar uses MUI `Avatar` with user's `avatarUrl`, fallback to initials

### 4.4 Follow Button (`follow-button.tsx`)

Client component. Appears on user profile pages and in the activity feed next to usernames.

**States:**
- Not following: outlined button "Follow"
- Following: filled button "Following", hover shows "Unfollow"
- Loading: disabled with spinner

### 4.5 Activity Feed (`activity-feed.tsx`)

Replaces/extends the current home page content for authenticated users.

**Layout:**
```
[Home page]
  [Board selector (existing)]
  [Activity Feed tab] [Discover tab]
    [Feed items...]
      [Ascent card: user avatar, name, climb thumbnail, grade, status, vote]
      [Comment highlight: quoted text, context link, vote]
      [Trending playlist climb: playlist name, climb info, vote count]
    [Load more / infinite scroll]
  [Empty state if no follows: "Follow climbers to see their activity"]
```

**For unauthenticated users:**
- Show trending/popular content globally (top-voted climbs, active playlists)
- Prompt to sign in for personalized feed

---

## Phase 5: Integration Points

### 5.1 Playlist Detail View

The existing playlist detail view needs these additions:
- **Per-climb vote buttons** in the climb list (inline, next to existing climb info)
- **Comment section** below each climb when expanded, or in a slide-up drawer on mobile
- **Sort by votes** option in the climb list (in addition to existing position sort)
- **Vote count** badge on each climb card

### 5.2 Ascent/Tick Detail

When viewing an ascent (in the activity feed or on a user profile):
- **Vote buttons** on the ascent card
- **Comment section** below the ascent

### 5.3 User Profile Page

The existing profile page (`/crusher/[user_id]/`) gets:
- **Follower/following counts** in the profile header
- **Follow button** (for other users' profiles)
- **Followers / Following tabs** showing user lists

### 5.4 Home Page

The home page (`packages/web/app/page.tsx`) currently redirects to a board. For authenticated users, it should show:
- A tab or toggle between "Activity Feed" and the existing board redirect behavior
- The activity feed as described in Phase 4.5

---

## Phase 6: Data Validation and Security

### 6.1 Entity Validation

Before accepting a comment or vote, validate the entity exists:

| `entity_type` | Validation |
|---|---|
| `playlist_climb` | Playlist exists, is public, climb exists in playlist |
| `tick` | Tick exists (all ticks are public via `userTicks` query) |
| `comment` | Comment exists and is not deleted (for votes on comments) |

### 6.2 Rate Limits

| Action | Limit |
|---|---|
| `addComment` | 10 per minute per user |
| `vote` | 30 per minute per user |
| `followUser` | 20 per minute per user |

Implement using a simple in-memory rate limiter (similar to the existing registration rate limiter), or Redis if the backend is multi-instance.

### 6.3 Content Moderation (future)

Not in initial scope, but design for it:
- Comments table has `deleted_at` for removal
- Add `reported_at` / `reported_by` columns later for user reports
- Admin tools can be built on top of soft-delete

### 6.4 Privacy

- Follows are public (you can see who follows whom) -- standard for fitness/activity apps
- Vote totals are public; individual votes are private (only you see your own vote)
- Comments are public on public entities

---

## Implementation Order

### Milestone 1: Core Infrastructure
1. Create `user_follows` table + migration
2. Create `comments` table + migration
3. Create `votes` table + migration
4. Add `social_entity_type` enum to schema
5. Export types from `packages/db`

### Milestone 2: Follow System
1. GraphQL types and inputs for follows
2. `followUser` / `unfollowUser` mutations
3. `followers` / `following` queries
4. `PublicUserProfile` type with follower counts
5. `FollowButton` client component
6. Integration with user profile page

### Milestone 3: Comments and Votes
1. GraphQL types for comments and votes
2. `addComment` / `updateComment` / `deleteComment` mutations
3. `comments` / `commentReplies` queries
4. `vote` mutation with toggle behavior
5. `voteSummary` / `bulkVoteSummaries` queries
6. `VoteButton` client component
7. `CommentSection` component
8. Integration with playlist detail view (comments + votes on playlist climbs)

### Milestone 4: Activity Feed
1. `activityFeed` query with cursor-based pagination
2. Feed aggregation logic (followed-user ascents + trending content)
3. `ActivityFeed` server component
4. `FeedItem` components (ascent, comment, playlist)
5. Home page integration
6. Empty state for users with no follows (suggest popular users to follow)

### Milestone 5: Polish and Performance
1. Bulk vote summary loading for list views
2. Optimistic UI for votes and comments
3. Rate limiting on social mutations
4. Cursor-based pagination for comments (if needed)
5. Consider `vote_counts` materialized view if vote aggregation becomes slow

---

## Open Questions

1. **Notifications**: Should users be notified when someone follows them, replies to their comment, or votes on their ascent? This would require a `notifications` table and either polling or push. Deferred to a separate plan.
2. **Comment editing**: The plan includes a 15-minute edit window. Should this be longer or removed entirely?
3. **Blocking users**: Should users be able to block others from commenting on their ascents? Not in initial scope but worth considering.
4. **Feed algorithm**: The initial feed is chronological with interleaved trending content. Should we add a "For You" algorithmic feed later?
5. **Playlist comment scope**: Are comments on a climb scoped to a specific playlist (so the same climb in two different playlists has independent comment threads), or are they global per climb? The plan assumes per-playlist scoping since the context matters (curated lists have different vibes).
