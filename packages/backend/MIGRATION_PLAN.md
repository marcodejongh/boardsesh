# Backend GraphQL Migration Plan

Migrate the backend from Express to GraphQL Yoga, then reimplement Next.js REST APIs as GraphQL queries/mutations.

## Decisions

- **Database**: Use `@boardsesh/db` directly - backend connects to same PostgreSQL database
- **Server**: Pure GraphQL Yoga (replace Express entirely)
- **Authentication**: JWT in Authorization header (same as WebSocket auth)
- **Scope**: High priority APIs first, incremental implementation
- **Exclusions**: Aurora proxy routes (`/api/v1/[board_name]/proxy/*`) stay in Next.js

---

## Phase 1: Express to GraphQL Yoga Migration ✅ COMPLETED

**PR**: [#421](https://github.com/marcodejongh/boardsesh/pull/421)

### Changes Made

| File | Description |
|------|-------------|
| `src/server.ts` | Rewritten with Yoga + custom request router |
| `src/handlers/cors.ts` | CORS utility with origin validation |
| `src/handlers/health.ts` | Health check endpoint |
| `src/handlers/join.ts` | Session redirect handler |
| `src/handlers/avatars.ts` | Avatar upload with busboy (replaced multer) |
| `src/handlers/static.ts` | Static file serving |
| `src/graphql/yoga.ts` | Yoga instance configuration |
| `src/websocket/setup.ts` | graphql-ws integration |
| `package.json` | Added graphql-yoga, busboy; removed express, multer |

### Architecture

```
Node.js HTTP Server
  |-- Custom Request Router
        |-- /graphql (GET/POST) --> GraphQL Yoga handler
        |-- /health             --> Health check handler
        |-- /join/:sessionId    --> Session redirect handler
        |-- /api/avatars        --> Avatar upload (busboy)
        |-- /static/avatars/*   --> Static file handler
  |-- WebSocketServer (/graphql) --> graphql-ws with existing schema
```

---

## Phase 2: REST API Reimplementation (IN PROGRESS)

Reimplement Next.js REST APIs as GraphQL queries/mutations. Only endpoints that query our database - Aurora proxy routes stay in Next.js.

### 2.1 Board Configuration Queries (High Priority)

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/v1/grades/[board_name]` | `Query.grades(boardName: String!)` | ✅ DONE |
| `GET /api/v1/angles/[board_name]/[layout_id]` | `Query.angles(boardName: String!, layoutId: Int!)` | ✅ DONE |
| N/A | `Query.layouts(boardName: String!)` | ✅ DONE |
| N/A | `Query.sizes(boardName: String!, layoutId: Int!)` | ✅ DONE |
| N/A | `Query.sets(boardName: String!, layoutId: Int!, sizeId: Int!)` | ✅ DONE |
| `GET /api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/details` | `Query.boardDetails(...)` | TODO |

**Source files:**
- `packages/web/app/api/v1/grades/[board_name]/route.ts`
- `packages/web/app/api/v1/angles/[board_name]/[layout_id]/route.ts`
- `packages/web/app/api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/details/route.ts`

### 2.2 Climb Queries (High Priority)

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/v1/[board_name]/.../search` | `Query.searchClimbs(input: ClimbSearchInput!)` | ✅ DONE |
| `GET /api/v1/[board_name]/.../[climb_uuid]` | `Query.climb(...)` | ✅ DONE |

**Medium Priority:**

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/v1/[board_name]/climb-stats/[climb_uuid]` | `Query.climbStats(...)` | TODO |
| `GET /api/v1/[board_name]/.../heatmap` | `Query.heatmap(...)` | TODO |
| `GET /api/v1/[board_name]/.../setters` | `Query.setters(...)` | TODO |

**Low Priority:**

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/v1/[board_name]/beta/[climb_uuid]` | `Query.betaLinks(...)` | TODO |

### 2.3 Slug Lookups (Medium Priority)

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/v1/[board_name]/slugs/layout/[slug]` | `Query.layoutBySlug(...)` | TODO |
| `GET /api/v1/[board_name]/slugs/size/[layout_id]/[slug]` | `Query.sizeBySlug(...)` | TODO |
| `GET /api/v1/[board_name]/slugs/sets/.../[slug]` | `Query.setsBySlug(...)` | TODO |

### 2.4 User Management (High Priority)

| REST Endpoint | GraphQL Operation | Status |
|---------------|-------------------|--------|
| `GET /api/internal/profile` | `Query.profile` | TODO |
| `PUT /api/internal/profile` | `Mutation.updateProfile(...)` | TODO |
| `POST /api/internal/profile/avatar` | `Mutation.uploadAvatar(...)` | TODO |
| `GET /api/internal/favorites` | `Query.favorites(...)` | TODO |
| `POST /api/internal/favorites` | `Mutation.toggleFavorite(...)` | TODO |
| `GET /api/internal/aurora-credentials` | `Query.auroraCredentials` | TODO |
| `GET /api/internal/aurora-credentials/[board_type]` | `Query.auroraCredential(...)` | TODO |
| `POST /api/internal/aurora-credentials` | `Mutation.saveAuroraCredential(...)` | TODO |
| `DELETE /api/internal/aurora-credentials` | `Mutation.deleteAuroraCredential(...)` | TODO |
| `GET /api/internal/aurora-credentials/unsynced` | `Query.unsyncedCounts` | TODO |
| `GET /api/internal/user-board-mapping` | `Query.userBoardMappings` | TODO |
| `POST /api/internal/user-board-mapping` | `Mutation.createUserBoardMapping(...)` | TODO |

### 2.5 Endpoints Staying in Next.js

| Endpoint | Reason |
|----------|--------|
| `/api/v1/[board_name]/proxy/*` | Aurora API proxy (external API) |
| `/api/auth/*` | NextAuth authentication |
| `/api/internal/ws-auth` | WebSocket auth token fetch |
| `/api/internal/shared-sync/[board_name]` | Cron job / server-side sync |
| `/api/og/climb` | Image generation (Edge runtime) |

---

## Phase 3: Type Sharing (PARTIAL)

Add new GraphQL types to `packages/shared-schema/src/schema.ts` and corresponding TypeScript types to `packages/shared-schema/src/types.ts`.

### Implemented Types
- `Grade`, `BoardAngle`, `Layout`, `Size`, `Set` - Board configuration types
- `ClimbSearchInput`, `ClimbSearchResult` - Climb search types

### New Types Needed

```graphql
# Board Configuration
type Grade { difficultyId: Int!, name: String! }
type Angle { angle: Int! }
type Hold { id: Int!, x: Float!, y: Float!, mirroredX: Float! }
type Image { url: String!, width: Int!, height: Int! }
type BoardDetails { holds: [Hold!]!, images: [Image!]!, ... }

# Climbs
input ClimbSearchInput { boardName: String!, layoutId: Int!, ... }
type ClimbSearchResult { climbs: [Climb!]!, totalCount: Int!, hasMore: Boolean! }
type ClimbStatsForAngle { angle: Int!, ascensionistCount: Int!, ... }
type HeatmapHold { holdId: Int!, totalUses: Int!, ... }
type SetterStats { setterId: Int!, username: String!, climbCount: Int! }
type BetaLink { link: String!, username: String!, thumbnail: String }

# Slugs
type LayoutRow { id: Int!, name: String!, ... }
type SizeRow { id: Int!, name: String!, ... }
type SetRow { id: Int!, name: String! }

# User Management
type UserProfile { id: String!, email: String!, displayName: String, avatarUrl: String }
type AuroraCredentialStatus { boardType: String!, username: String!, ... }
type Favorite { climbUuid: String!, angle: Int! }
```

---

## Phase 4: Feature Parity Testing (TODO)

### Strategy
1. Run both servers simultaneously (Next.js on 3000, backend on 8080)
2. For each migrated endpoint:
   - Call REST API, capture JSON response
   - Call GraphQL query with same parameters
   - Assert structural equality
3. Create test script for automated comparison

---

## Implementation Order

### Milestone 1: Yoga Migration ✅
- [x] Add graphql-yoga and related packages
- [x] Rewrite server.ts for pure Yoga
- [x] Implement non-GraphQL routes (health, avatars, static)
- [x] Verify WebSocket subscriptions work
- [x] Remove Express dependency

### Milestone 2: Core Queries (High Priority) - IN PROGRESS
- [x] Add new types to shared-schema
- [x] Implement `grades`, `angles`, `layouts`, `sizes`, `sets` queries
- [x] Implement `searchClimbs`, `climb` queries
- [ ] Implement `boardDetails` query (complex - requires hold/LED data)
- [ ] Implement `profile` query and `updateProfile` mutation
- [ ] Implement `auroraCredentials` queries/mutations

### Milestone 3: Supporting Queries (Medium Priority)
- [ ] Implement `climbStats`, `heatmap`, `setters` queries
- [ ] Implement slug lookup queries
- [ ] Implement `favorites` query and `toggleFavorite` mutation
- [ ] Implement `userBoardMappings` query/mutation

### Milestone 4: Remaining Items (Low Priority)
- [ ] Implement `betaLinks` query
- [ ] Implement `unsyncedCounts` query
- [ ] Implement `uploadAvatar` mutation (file upload via GraphQL)

---

## Testing

```bash
# Start databases
npm run db:up

# Start backend
npm run backend:dev

# Start frontend
npm run dev

# Test health endpoint
curl http://localhost:8080/health

# Test GraphQL
curl http://localhost:8080/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```
