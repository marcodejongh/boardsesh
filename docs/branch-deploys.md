# Branch Deploys: Comprehensive Restoration Strategy

## Current State & Problem

### Architecture Summary

Boardsesh is a monorepo with three deployable services:

| Service | Platform | Database | Purpose |
|---------|----------|----------|---------|
| **Web** (`packages/web`) | Vercel (Next.js 15) | Neon PostgreSQL | SSR pages, API routes, auth |
| **Backend** (`packages/backend`) | Railway (Node.js) | Same Neon DB + Redis | GraphQL WS subscriptions, sessions, sync |
| **Dev DB** (`packages/db`) | Docker (local only) | PostgreSQL + PostGIS | Local development |

### What Broke

Branch deploys stopped working after migrating from Vercel Postgres (which was a managed Neon account under Vercel) to a direct Neon paid account. Specifically:

1. **Neon branching integration is broken** - The Vercel-Neon integration that automatically created database branches per preview deployment no longer functions. Neon support has not resolved this.
2. **Migrations are skipped on preview** - `vercel.json` explicitly skips migrations for preview deploys:
   ```json
   "buildCommand": "if [ \"$VERCEL_ENV\" != \"preview\" ]; then npm run db:migrate; fi && npm run build --workspace=@boardsesh/web"
   ```
3. **No backend branching** - Railway has no automatic branch deploy mechanism tied to Vercel previews. Preview frontends either point to the production backend or have no backend at all.
4. **`NEXT_PUBLIC_WS_URL` is not set for preview** - Preview deployments don't know where to find a backend, so party mode is non-functional.

### What Still Works

- Vercel still creates preview deployments for every PR (frontend builds succeed)
- The backend CORS handler already allows Vercel preview origins (`packages/backend/src/handlers/cors.ts:4`):
  ```ts
  const VERCEL_PREVIEW_REGEX = /^https:\/\/boardsesh-[a-z0-9]+-marcodejonghs-projects\.vercel\.app$/;
  ```
- The join handler already uses a `backendUrl` query param pattern (`packages/backend/src/handlers/join.ts:56`)
- GitHub Actions CI runs on PRs (typecheck, lint, tests)
- The `boardsesh-dev-db` Docker image contains all board data and is rebuilt automatically

---

## Phase 1: Quick Win - Frontend-Only Branch Deploys

**Effort: ~1-2 days | Impact: Preview deploys become functional for frontend-only changes**

### 1.1 Re-enable Migrations on Preview

Drizzle migrations are idempotent - running them against production is safe. The current skip was a workaround for the broken Neon branching (to avoid running migrations against a non-existent branch DB). Since previews now connect to the main database anyway, migrations should run.

**Change in `vercel.json`:**
```json
{
  "buildCommand": "npm run db:migrate && npm run build --workspace=@boardsesh/web"
}
```

> **Risk:** Preview deploys run migrations against the production database. This is safe for additive migrations (new tables, columns) but destructive migrations (drops, renames) could affect production. Mitigation: enforce migration review in PR process - destructive migrations should only land on main after careful review.

### 1.2 Set `NEXT_PUBLIC_WS_URL` for Preview Scope

In Vercel project settings, add `NEXT_PUBLIC_WS_URL` with Environment scope set to **Preview**:

```
NEXT_PUBLIC_WS_URL=wss://backend-production.up.railway.app/graphql
```

This points all preview deployments at the production backend. Party mode, sessions, and real-time features will work against production data.

**Files affected:**
- `packages/web/app/components/connection-manager/connection-settings-context.tsx:9` - reads `NEXT_PUBLIC_WS_URL`
- `packages/web/app/lib/graphql/client.ts:10-11` - converts WS URL to HTTP for GraphQL queries

### 1.3 Change Detection Workflow

Create `.github/workflows/branch-deploy.yml` using `dorny/paths-filter` to label PRs and conditionally trigger jobs based on what changed:

```yaml
name: Branch Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      backend: ${{ steps.filter.outputs.backend }}
      db: ${{ steps.filter.outputs.db }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'packages/web/**'
              - 'packages/shared-schema/**'
            backend:
              - 'packages/backend/**'
              - 'packages/shared-schema/**'
            db:
              - 'packages/db/src/schema/**'
              - 'packages/db/drizzle/**'
            shared:
              - 'packages/shared-schema/**'

  # Phase 1: Just report what changed
  # Phase 2: Trigger backend/db branch deploys conditionally
  report:
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const changes = [];
            if ('${{ needs.detect-changes.outputs.web }}' === 'true') changes.push('web');
            if ('${{ needs.detect-changes.outputs.backend }}' === 'true') changes.push('backend');
            if ('${{ needs.detect-changes.outputs.db }}' === 'true') changes.push('db');
            if ('${{ needs.detect-changes.outputs.shared }}' === 'true') changes.push('shared-schema');
            // Add labels, post comments, etc.
```

### Phase 1 Result

After Phase 1, every Vercel preview deployment:
- Runs migrations (safe, idempotent)
- Connects to the production backend for party mode
- Has full functionality for testing frontend changes
- CI reports which packages were modified

---

## Phase 2: Full-Stack Branch Deploys

**Effort: ~3-5 days | Impact: Isolated backend + database per PR when needed**

### 2.1 Database Branching

#### Option A: Neon API (Primary)

Programmatically create Neon branches via their API, bypassing the broken Vercel integration:

```bash
# Create a branch from main
curl -X POST "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": {
      "name": "pr-${PR_NUMBER}",
      "parent_id": "${MAIN_BRANCH_ID}"
    },
    "endpoints": [{
      "type": "read_write"
    }]
  }'
```

**Pros:** Instant branching (copy-on-write), no data duplication cost, full production data available.
**Cons:** Requires working Neon API access, adds API key management.

**GitHub Actions integration:**
```yaml
create-db-branch:
  needs: detect-changes
  if: needs.detect-changes.outputs.db == 'true'
  runs-on: ubuntu-latest
  outputs:
    connection_string: ${{ steps.create.outputs.connection_string }}
  steps:
    - name: Create Neon branch
      id: create
      uses: neondatabase/create-branch-action@v5
      with:
        project_id: ${{ secrets.NEON_PROJECT_ID }}
        branch_name: pr-${{ github.event.pull_request.number }}
        api_key: ${{ secrets.NEON_API_KEY }}

    - name: Run migrations
      run: |
        DATABASE_URL="${{ steps.create.outputs.db_url }}" npm run db:migrate
```

#### Option B: Railway PostgreSQL with Dev DB Image (Fallback)

If Neon branching remains unreliable, spin up a Railway PostgreSQL service using the pre-built `ghcr.io/marcodejongh/boardsesh-dev-db` image:

```bash
# Railway CLI - create ephemeral service from Docker image
railway service create \
  --name "db-pr-${PR_NUMBER}" \
  --image ghcr.io/marcodejongh/boardsesh-dev-db:latest
```

**Pros:** Fully independent, uses existing Docker image with all board data, no Neon dependency.
**Cons:** Slower startup (~30-60s), no production data (uses seed data), costs more (full PostgreSQL instance per PR).

#### Recommendation

Use Option A (Neon API) as primary. It's faster, cheaper, and has production data. Keep Option B as documented fallback if Neon proves unreliable.

### 2.2 Backend Branching via Railway

Railway supports environments that can be created per-PR:

```bash
# Create an ephemeral environment for this PR
railway environment create "pr-${PR_NUMBER}"

# Deploy the backend to this environment
railway up --environment "pr-${PR_NUMBER}" \
  --service backend \
  --detach
```

**Required environment variables for branch backend:**
```
DATABASE_URL=<branch database connection string>
REDIS_URL=<shared or branch Redis>
BOARDSESH_URL=https://boardsesh-${HASH}-marcodejonghs-projects.vercel.app
CRON_SECRET=<same as production>
PORT=8080
```

**Redis strategy:** Use the production Redis instance for branch backends. Redis data is ephemeral (pub/sub, session TTLs) and namespaced by session ID, so there's no collision risk. This avoids the cost and complexity of per-PR Redis instances.

### 2.3 Frontend-to-Branch-Backend Connection

The join handler (`packages/backend/src/handlers/join.ts:56`) already constructs a `backendUrl` query param:

```ts
const redirectUrl = `${boardseshUrl}${sessionInfo.boardPath}?backendUrl=${encodeURIComponent(backendUrl)}&sessionId=${encodeURIComponent(sessionId)}`;
```

Extend this pattern to allow any preview deployment to connect to its corresponding branch backend.

#### Implementation: Runtime `backendUrl` Override

**Step 1: Refactor `NEXT_PUBLIC_WS_URL` resolution into a shared utility**

Currently, `NEXT_PUBLIC_WS_URL` is read in two places:
- `packages/web/app/components/connection-manager/connection-settings-context.tsx:9` (client-side, compile-time)
- `packages/web/app/lib/graphql/client.ts:10` (used in both client and server contexts)

Create a shared resolver that checks (in priority order):
1. `backendUrl` query parameter (from URL)
2. `NEXT_PUBLIC_WS_URL` environment variable (compile-time)

```ts
// packages/web/app/lib/backend-url.ts
export function resolveBackendUrl(queryParams?: URLSearchParams): string | null {
  // 1. Runtime override from URL query param
  if (typeof window !== 'undefined') {
    const params = queryParams || new URLSearchParams(window.location.search);
    const override = params.get('backendUrl');
    if (override) return override;
  }

  // 2. Build-time env var
  return process.env.NEXT_PUBLIC_WS_URL || null;
}
```

**Step 2: Update `ConnectionSettingsContext` to use the resolver**

The context already exposes `backendUrl` - update it to check query params first:

```ts
// In ConnectionSettingsProvider
const [backendUrl, setBackendUrl] = useState<string | null>(BACKEND_URL);

useEffect(() => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const override = params.get('backendUrl');
  if (override) {
    setBackendUrl(override);
  }
}, []);
```

**Step 3: Set `NEXT_PUBLIC_WS_URL` per Vercel preview via GitHub Actions**

After creating a Railway branch backend, use the Vercel CLI to set the env var for that specific deployment:

```bash
# Get the Railway backend URL for this PR
BRANCH_BACKEND_URL="wss://backend-pr-${PR_NUMBER}.up.railway.app/graphql"

# Set it as a Vercel env var scoped to preview
vercel env add NEXT_PUBLIC_WS_URL preview <<< "${BRANCH_BACKEND_URL}"

# Trigger a redeploy of the preview
vercel redeploy --target preview
```

Alternatively, rely entirely on the `backendUrl` query param approach, which requires no Vercel env var changes but means users must navigate via the backend's `/join/` endpoint or append the param manually.

### 2.4 Cleanup on PR Close

```yaml
# .github/workflows/branch-deploy-cleanup.yml
name: Branch Deploy Cleanup

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon branch
        if: always()
        continue-on-error: true
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Delete Railway environment
        if: always()
        continue-on-error: true
        run: |
          railway environment delete "pr-${{ github.event.pull_request.number }}" --yes
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Phase 2 Result

After Phase 2, PRs that modify backend or database code get:
- An isolated Neon database branch (copy-on-write from production)
- A dedicated Railway backend instance
- Frontend preview connected to the branch backend
- Automatic cleanup when the PR is closed/merged

---

## Phase 3: API Consolidation

**Effort: ~2-4 weeks (incremental) | Impact: Fewer services need direct DB access, simpler branch deploys**

### Why This Matters for Branch Deploys

Currently, both the Next.js frontend (via API routes) and the backend need `DATABASE_URL`. This means branch deploys require:
1. A branch database
2. A branch backend
3. A preview frontend configured to use both

If API routes move to the backend's GraphQL layer, the frontend only needs `NEXT_PUBLIC_WS_URL` - no direct database access. Branch deploys simplify to: branch database + branch backend. The frontend preview "just works" by pointing at the branch backend.

### What Stays in Next.js

These routes are tightly coupled to Next.js auth/middleware and should remain:

| Route | Reason |
|-------|--------|
| `/api/internal/ws-auth` | Issues JWT tokens for WebSocket auth, uses Next.js session |
| `/api/internal/aurora-credentials` | Manages Aurora API tokens, auth-gated |
| `/api/internal/controllers` | Board controller registration, auth-gated |

### What Moves to Backend GraphQL

Organized by migration priority (pure reads first, then mutations, then proxies):

#### Batch 1: Pure Reads (lowest risk)
| Current Route | GraphQL Query |
|---------------|---------------|
| `/api/v1/[board]/[layout]/[size]/[sets]/[angle]/[climb_uuid]` | `query climb(board, uuid)` |
| `/api/v1/[board]/[layout]/[size]/[sets]/[angle]/setters` | `query setters(board, ...)` |
| `/api/v1/[board]/[layout]/[size]/[sets]/[angle]/heatmap` | `query heatmap(board, ...)` |
| `/api/v1/[board]/climb-stats/[climb_uuid]` | `query climbStats(board, uuid)` |
| `/api/v1/[board]/beta/[climb_uuid]` | `query beta(board, uuid)` |
| `/api/v1/[board]/grades` | `query grades(board)` |
| `/api/v1/angles/[board]/[layout]` | `query angles(board, layout)` |
| `/api/v1/grades/[board]` | `query gradeSystem(board)` |
| `/api/v1/[board]/slugs/**` | `query slugs(board, ...)` |
| `/api/internal/profile/[userId]` | `query profile(userId)` |
| `/api/internal/favorites` | `query favorites` |
| `/api/internal/hold-classifications` | `query holdClassifications` |
| `/api/internal/user-board-mapping` | `query userBoardMapping` |
| `/api/internal/climb-redirect` | `query climbRedirect(...)` |

#### Batch 2: Mutations
| Current Route | GraphQL Mutation |
|---------------|-----------------|
| `/api/internal/profile` (POST/PUT) | `mutation updateProfile(...)` |
| `/api/internal/favorites` (POST/DELETE) | `mutation toggleFavorite(...)` |

#### Batch 3: Aurora API Proxies
| Current Route | GraphQL Query/Mutation |
|---------------|----------------------|
| `/api/v1/[board]/proxy/login` | `mutation auroraLogin(board, ...)` |
| `/api/v1/[board]/proxy/getLogbook` | `query auroraLogbook(board, ...)` |
| `/api/v1/[board]/proxy/saveAscent` | `mutation auroraSaveAscent(board, ...)` |
| `/api/v1/[board]/proxy/saveClimb` | `mutation auroraSaveClimb(board, ...)` |
| `/api/v1/[board]/proxy/user-sync` | `mutation auroraUserSync(board, ...)` |

#### Migration Approach

For each route being migrated:

1. Add the GraphQL query/mutation to the shared schema (`packages/shared-schema/src/schema.ts`)
2. Implement the resolver in the backend (`packages/backend/src/graphql/`)
3. Update frontend consumers to use the GraphQL client instead of `fetch('/api/...')`
4. Keep the Next.js route as a thin proxy during transition (forwards to GraphQL)
5. Remove the Next.js route once all consumers are migrated

### Phase 3 Result

After API consolidation:
- Frontend has no direct database dependency (except auth routes)
- Branch deploys only need: Neon branch + Railway backend
- Frontend previews connect to branch backend via `NEXT_PUBLIC_WS_URL`
- Single source of truth for all data access (GraphQL schema)

---

## Phase 4: Sync Migration

**Effort: ~1-2 weeks | Impact: Remove Vercel crons, centralize sync on backend**

### Current State

Sync runs in two places:

1. **Vercel crons** (`vercel.json:6-22`):
   - `/api/internal/shared-sync/tension` - every 2 hours
   - `/api/internal/shared-sync/kilter` - every 2 hours
   - `/api/internal/user-sync-cron` - every 2 hours
   - `/api/internal/migrate-users-cron` - daily at 3am

2. **Backend** (`packages/backend/src/handlers/sync.ts`):
   - `/sync-cron` - already handles user sync via `@boardsesh/aurora-sync`

### Migration Steps

1. **Add shared sync to backend** - The `@boardsesh/aurora-sync` package already exists. Add a `/shared-sync-cron` endpoint to the backend that calls the shared sync runner for both Kilter and Tension.

2. **Add user migration to backend** - Move the `migrate-users-cron` logic to a backend endpoint.

3. **Set up external cron triggers** - Use Railway's built-in cron or an external service (e.g., cron-job.org, GitHub Actions scheduled workflow) to hit the backend sync endpoints:
   ```yaml
   # .github/workflows/sync-cron.yml
   name: Sync Cron
   on:
     schedule:
       - cron: '0 */2 * * *'  # Every 2 hours
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger user sync
           run: |
             curl -X POST https://backend.boardsesh.com/sync-cron \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
         - name: Trigger shared sync
           run: |
             curl -X POST https://backend.boardsesh.com/shared-sync-cron \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```

4. **Remove Vercel crons** - Delete the `crons` array from `vercel.json` and remove the corresponding API route handlers.

### Branch Deploy Sync Strategy

Sync should be **disabled by default** for branch deployments:
- Branch backends don't need to sync with Aurora API (they use snapshot data from the Neon branch)
- Running sync on branch databases would waste Aurora API rate limits
- If sync testing is needed, it can be triggered manually via the endpoint

---

## Decision Matrix

What changed → what gets deployed:

| Changed Package | Vercel Preview | Branch DB | Branch Backend | Notes |
|----------------|:-:|:-:|:-:|-------|
| `packages/web` only | Yes | No | No | Uses production DB + backend |
| `packages/shared-schema` | Yes | No | Yes | Shared types affect both |
| `packages/backend` only | Yes | No | Yes | Frontend preview points to branch backend |
| `packages/db/src/schema` | Yes | Yes | Yes | Schema change needs isolated DB |
| `packages/db/drizzle` | Yes | Yes | Yes | Migration needs isolated DB |
| `packages/aurora-sync` | No | No | Optional | Test via manual sync trigger |
| Multiple packages | Yes | If DB changed | If backend/shared changed | Combines rules above |

**Implementation:** The `dorny/paths-filter` step from Phase 1 (Section 1.3) drives this matrix. Each downstream job has an `if` condition based on the filter outputs.

---

## Cost & Complexity Analysis

### Phase 1 (Frontend-Only)

| Item | Cost | Complexity |
|------|------|------------|
| Vercel preview deploys | Free (included in plan) | Minimal - one `vercel.json` change |
| GitHub Actions minutes | Free tier (~2000 min/month) | Low - simple workflow |
| **Total** | **$0/month** | **~1-2 days** |

### Phase 2 (Full-Stack)

| Item | Cost | Complexity |
|------|------|------------|
| Neon branches | Free (included in paid plan, copy-on-write) | Medium - API integration |
| Railway branch environments | ~$5-10/month per active PR | Medium - CLI scripting |
| Redis (shared) | $0 incremental | None - reuse production |
| GitHub Actions | Minimal additional minutes | Medium - cleanup workflows |
| **Total** | **~$5-20/month** (depends on concurrent PRs) | **~3-5 days** |

### Phase 3 (API Consolidation)

| Item | Cost | Complexity |
|------|------|------------|
| Development time | N/A | High - incremental refactor |
| Runtime cost change | Slight reduction (fewer Vercel function invocations) | N/A |
| **Total** | **Net neutral or slight savings** | **~2-4 weeks** |

### Phase 4 (Sync Migration)

| Item | Cost | Complexity |
|------|------|------------|
| Remove Vercel crons | Slight savings (fewer function invocations) | Low |
| Backend sync endpoints | Already partially done | Low-Medium |
| External cron | Free (GitHub Actions scheduled) | Low |
| **Total** | **Slight savings** | **~1-2 weeks** |

---

## Risks & Mitigations

### Phase 1

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Preview migration runs destructive SQL against production | Low | High | Code review process for migrations; add CI check that flags `DROP`/`ALTER...DROP` in migration files |
| Preview deploys create stale sessions on production backend | Low | Low | Sessions auto-expire via TTL (existing `autoEndInterval` in `packages/backend/src/server.ts:294`) |

### Phase 2

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Neon API is unreliable/slow | Medium | Medium | Documented Railway fallback (Option B in Section 2.1) |
| Railway branch environments leak (not cleaned up) | Low | Medium | Cleanup workflow on PR close + weekly scheduled sweep |
| Branch backend connects to wrong database | Low | High | `DATABASE_URL` is set per-environment; add health check that logs DB branch name |
| Cost creep from forgotten branch environments | Low | Medium | Weekly GH Action that lists Railway environments and posts Slack alert for any > 7 days old |

### Phase 3

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GraphQL schema bloat | Medium | Low | Organize by domain (board queries, user queries, etc.) |
| Breaking frontend during migration | Medium | Medium | Keep old API routes as thin proxies during transition; remove only after all consumers migrated |
| Performance regression (extra network hop) | Low | Low | Frontend already makes GraphQL calls for session data; batch queries where possible |

### Phase 4

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sync downtime during migration | Low | Medium | Run both Vercel crons and backend sync in parallel for 1 week before removing Vercel crons |
| Aurora API rate limiting | Low | Medium | Backend sync already limits to 1 user per call (`packages/backend/src/handlers/sync.ts:31`) |

---

## Key Files Reference

| File | Relevance |
|------|-----------|
| `vercel.json` | Build command (migration skip), cron definitions |
| `packages/web/app/components/connection-manager/connection-settings-context.tsx` | `NEXT_PUBLIC_WS_URL` resolution, party mode |
| `packages/web/app/lib/graphql/client.ts` | GraphQL HTTP client, WS-to-HTTP URL conversion |
| `packages/backend/src/handlers/cors.ts` | Vercel preview CORS regex |
| `packages/backend/src/handlers/join.ts` | Existing `backendUrl` query param pattern |
| `packages/backend/src/handlers/sync.ts` | User sync cron endpoint |
| `packages/backend/src/server.ts` | All backend HTTP routes, session cleanup |
| `packages/backend/railway.toml` | Railway deploy config, replica count |
| `packages/backend/Dockerfile` | Backend container build |
| `packages/aurora-sync/` | Shared sync library used by both web and backend |
| `.github/workflows/dev-db-docker.yml` | Existing path-filtered CI for DB changes |
| `.github/workflows/test.yml` | Existing CI for web package |
| `packages/web/app/api/internal/` | 12 route files to eventually migrate |
| `packages/web/app/api/v1/` | 16 route files to eventually migrate |
