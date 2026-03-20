# Branch Deploys: Comprehensive Restoration Strategy

## Current State & Problem

### Architecture Summary

Boardsesh is a monorepo with three deployable services:

| Service | Production | Branch Deploys |
|---------|-----------|----------------|
| **Web** (`packages/web`) | Vercel (Next.js 15) | Vercel preview at `{PRID}.preview.boardsesh.com` |
| **Backend** (`packages/backend`) | Railway (Node.js) | Homelab Docker at `{PRID}.ws.preview.boardsesh.com` |
| **Database** (`packages/db`) | Neon PostgreSQL | `boardsesh-dev-db` Docker image (per PR) |

### What Broke

Branch deploys stopped working after migrating from Vercel Postgres (which was a managed Neon account under Vercel) to a direct Neon paid account. Specifically:

1. **Neon branching integration is broken** - The Vercel-Neon integration that automatically created database branches per preview deployment no longer functions. Neon support has not resolved this.
2. **Migrations are skipped on preview** - `vercel.json` explicitly skips migrations for preview deploys:
   ```json
   "buildCommand": "if [ \"$VERCEL_ENV\" != \"preview\" ]; then npm run db:migrate; fi && npm run build --workspace=@boardsesh/web"
   ```
3. **No backend branching** - No automatic branch deploy mechanism tied to Vercel previews. Preview frontends either point to the production backend or have no backend at all.
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

Drizzle migrations are idempotent - running them against the development database is safe. The current skip was a workaround for the broken Neon branching (to avoid running migrations against a non-existent branch DB). Since branch deploys use the pre-built `boardsesh-dev-db` Docker image (not the production database), migrations should run unconditionally.

**Change in `vercel.json`:**
```json
{
  "buildCommand": "npm run db:migrate && npm run build --workspace=@boardsesh/web"
}
```

> **Note:** Migrations run against the development database Docker image, not production. There is no risk of destructive SQL affecting production data.

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

## Phase 2: Full-Stack Branch Deploys on Homelab

**Effort: ~3-5 days | Impact: Isolated backend + database per PR, $0/month**

### 2.1 Architecture Overview

```
Vercel Preview ──→ Cloudflare ──→ CF Tunnel ──→ Traefik VIP ──→ PR Container
{N}.preview.        edge TLS      cloudflared    172.16.0.2     172.16.0.10:{10000+N}
boardsesh.com                      (VM 114)      (HA VIP)       (boardsesh-daemon VM)
```

- **Frontend**: Vercel preview, aliased to `{PRID}.preview.boardsesh.com`
- **Backend**: Docker container on boardsesh-daemon VM (`172.16.0.10`), host port `10000+N`, internal port 8080
- **Database**: `ghcr.io/marcodejongh/boardsesh-dev-db:latest`, internal only (no host port — backend connects via Docker network)
- **Routing**: Traefik dynamic config file per PR in `/etc/traefik/dynamic/`, auto-detected (`watch: true` file provider)
- **DNS**: `*.preview.boardsesh.com` wildcard CNAME → Cloudflare Tunnel
- **TLS**: Cloudflare edge TLS for `*.preview.boardsesh.com`
- **Orchestration**: Ansible playbook `manage_branch_deploys.yml` is the single source of truth
- **Cost**: $0/month (homelab resources already provisioned)

### 2.2 Public Access via Cloudflare Tunnel

Existing `cloudflared` (VM 114) gets three configuration additions:

1. **Cloudflare DNS**: Wildcard CNAME `*.preview.boardsesh.com` → tunnel
2. **Tunnel ingress rule**: `*.ws.preview.boardsesh.com` → `https://172.16.0.2` (Traefik VIP)
3. **Vercel**: Wildcard custom domain `*.preview.boardsesh.com` for preview aliasing

### 2.3 Prerequisite: Wire up `getBackendWsUrl()`

> **Document only** — code changes happen in a separate task.

`packages/web/app/lib/backend-url.ts` exists with runtime URL resolution but is NOT wired into the codebase. Two changes are needed:

**A) Update `deriveWsUrlFromHost()` pattern**

Currently produces a dash-delimited backend hostname:
```
pr-5.preview.boardsesh.com → wss://pr-5-ws.preview.boardsesh.com/graphql
```

Must change to a dot subdomain to match the Cloudflare Tunnel / Traefik routing scheme:
```
pr-5.preview.boardsesh.com → wss://pr-5.ws.preview.boardsesh.com/graphql
```

Specifically, in `deriveWsUrlFromHost()` (line 38), the pattern `${prLabel}-ws.${rest}` needs to become `${prLabel}.ws.${rest}` (or equivalent restructure of the regex match groups).

**B) Migrate 11 call sites from `process.env.NEXT_PUBLIC_WS_URL` to `getBackendWsUrl()`**

The following files read `NEXT_PUBLIC_WS_URL` directly and need to import `getBackendWsUrl()` instead:

1. `packages/web/app/components/connection-manager/connection-settings-context.tsx:9`
2. `packages/web/app/lib/graphql/client.ts:10`
3. `packages/web/app/components/party-session/persistent-session-context.tsx:63`
4. `packages/web/app/components/party-session/join-session-tab.tsx:17`
5. `packages/web/app/components/notifications/use-notification-subscription.ts:55`
6. `packages/web/app/components/climbs/use-save-climb.ts:37`
7. `packages/web/app/components/climbs/comment-section.tsx:39`
8. `packages/web/app/components/climbs/create-climb-form.tsx:297`
9. `packages/web/app/components/social/subscribe-button.tsx:43`
10. `packages/web/app/components/social/new-climb-feed.tsx:47`
11. `packages/web/app/components/settings/settings-page-content.tsx:36`

### 2.4 Ansible Playbook: `manage_branch_deploys.yml`

This is the core of Phase 2. A single playbook that manages all PR environments on the boardsesh-daemon VM. GitHub Actions simply invokes this playbook — all logic lives in Ansible.

#### Modes of operation

| Mode | Invocation | What it does |
|------|-----------|--------------|
| **Deploy** | `-e pr_number=123 -e action=deploy` | Create/update containers + Traefik config for PR #123 |
| **Cleanup** | `-e pr_number=123 -e action=cleanup` | Remove containers + Traefik config for PR #123 |
| **Sweep** | `-e action=sweep` | Query GitHub API for open PRs, remove environments for closed PRs |

#### Playbook responsibilities

- Generate `docker-compose.yml` from template into `/opt/boardsesh/pr-{N}/`
- Pull images, start containers (`docker compose up -d`)
- Generate Traefik dynamic config into `/etc/traefik/dynamic/boardsesh-pr-{N}.yml` on both Traefik LXCs (VM 141 primary, VM 153 secondary)
- Health check the backend at `http://localhost:{10000+N}/health`
- For sweep: use `gh api` or `curl` to list open PRs, compare against running compose projects, remove stale ones

#### New role: `boardsesh_branch_deploy`

Based on existing `boardsesh_daemon` role patterns:

```
roles/boardsesh_branch_deploy/
├── defaults/main.yml          # port formula, image defaults, data dir
├── templates/
│   ├── docker-compose.pr.yml.j2    # per-PR compose file
│   └── traefik-pr-router.yml.j2    # per-PR Traefik dynamic config
└── tasks/
    ├── deploy.yml             # create dirs, template compose, pull, start, health check
    ├── cleanup.yml            # compose down -v, rm dirs, rm Traefik config
    └── sweep.yml              # query GitHub, find stale, loop cleanup
```

Defaults:
- `boardsesh_pr_base_port: 10000`
- `boardsesh_pr_data_dir: /opt/boardsesh`
- Image defaults for daemon and dev-db

#### Docker compose template (`docker-compose.pr.yml.j2`)

```yaml
services:
  daemon:
    image: "{{ boardsesh_pr_daemon_image }}"
    container_name: boardsesh-pr-{{ pr_number }}-daemon
    ports:
      - "{{ 10000 + pr_number | int }}:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:{{ boardsesh_pr_postgres_password }}@db:5432/boardsesh
      - PORT=8080
      - BOARDSESH_URL=https://{{ pr_number }}.preview.boardsesh.com
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      start_period: 10s
      retries: 3

  db:
    image: ghcr.io/marcodejongh/boardsesh-dev-db:latest
    container_name: boardsesh-pr-{{ pr_number }}-db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

networks:
  default:
    name: boardsesh-pr-{{ pr_number }}
```

Note: The database has no host port — only the backend container can reach it via Docker network. This keeps port allocation simple (one host port per PR).

#### Traefik dynamic config template (`traefik-pr-router.yml.j2`)

```yaml
http:
  routers:
    boardsesh-pr-{{ pr_number }}:
      rule: "Host(`{{ pr_number }}.ws.preview.boardsesh.com`)"
      entryPoints:
        - websecure
      service: boardsesh-pr-{{ pr_number }}
      middlewares:
        - secure-headers
      tls:
        certResolver: letsencrypt
  services:
    boardsesh-pr-{{ pr_number }}:
      loadBalancer:
        servers:
          - url: "http://172.16.0.10:{{ 10000 + pr_number | int }}"
```

No Traefik restart needed — the file provider watches `/etc/traefik/dynamic/` and picks up new config files automatically.

### 2.5 GitHub Actions Workflows

Three workflows in the boardsesh repo (`.github/workflows/`), each invoking the Ansible playbook on a self-hosted runner:

#### `branch-deploy.yml` — Deploy on PR events

```yaml
name: Branch Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: [self-hosted, homelab, ephemeral]
    container:
      image: ghcr.io/marcodejongh/blackheathdc-ansible/ci-runner:latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy PR environment
        run: |
          ansible-playbook manage_branch_deploys.yml \
            -e pr_number=${{ github.event.pull_request.number }} \
            -e action=deploy \
            -e daemon_image_tag=pr-${{ github.event.pull_request.number }}
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const pr = ${{ github.event.pull_request.number }};
            const body = [
              '### Branch Deploy Ready',
              '',
              `| Service | URL |`,
              `|---------|-----|`,
              `| Frontend | https://${pr}.preview.boardsesh.com |`,
              `| Backend WS | wss://${pr}.ws.preview.boardsesh.com/graphql |`,
              `| Health check | https://${pr}.ws.preview.boardsesh.com/health |`,
            ].join('\n');
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr,
              body,
            });
```

#### `branch-deploy-cleanup.yml` — Cleanup on PR close

```yaml
name: Branch Deploy Cleanup

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: [self-hosted, homelab, ephemeral]
    container:
      image: ghcr.io/marcodejongh/blackheathdc-ansible/ci-runner:latest
    steps:
      - uses: actions/checkout@v4
      - name: Cleanup PR environment
        run: |
          ansible-playbook manage_branch_deploys.yml \
            -e pr_number=${{ github.event.pull_request.number }} \
            -e action=cleanup
```

#### `branch-deploy-sweep.yml` — Sweep stale environments

```yaml
name: Branch Deploy Sweep

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 3 * * *'  # Daily at 3am

jobs:
  sweep:
    runs-on: [self-hosted, homelab, ephemeral]
    container:
      image: ghcr.io/marcodejongh/blackheathdc-ansible/ci-runner:latest
    steps:
      - uses: actions/checkout@v4
      - name: Sweep stale PR environments
        run: |
          ansible-playbook manage_branch_deploys.yml \
            -e action=sweep \
            -e github_token=${{ secrets.GITHUB_TOKEN }}
```

### 2.6 Ansible Changes Summary

**New in `blackheathdc-ansible`:**
- `roles/boardsesh_branch_deploy/` — new role (defaults, templates, tasks)
- `playbooks/manage_branch_deploys.yml` — new playbook

**Modified:**
- `roles/boardsesh_daemon/defaults/main.yml` — add UFW rules for port range 10000-10100 from Traefik VIP
- `cloudflared` config — add `*.ws.preview.boardsesh.com` ingress rule → `https://172.16.0.2`
- Cloudflare DNS — add wildcard CNAME `*.preview.boardsesh.com`

**Unchanged:**
- `group_vars/services.yml` — production boardsesh entry unchanged
- `roles/traefik/templates/dynamic/routers.yml.j2` — PR routes are separate files, not part of main template
- Existing `boardsesh_daemon` role tasks — production deployment unchanged

### 2.7 CORS

Already handled — `VERCEL_PREVIEW_REGEX` in `packages/backend/src/handlers/cors.ts` matches all Vercel preview URLs. No changes needed.

### 2.8 Resource Limits & Capacity

- ~700MB per PR environment (200MB Node.js backend + 500MB dev-db PostgreSQL)
- Boardsesh-daemon VM runs on ms01-beta (96GB node, VM can be sized as needed)
- Max 5-8 concurrent PR environments recommended
- Sweep task cleans up daily at 3am + on every push to main

### Phase 2 Result

After Phase 2, PRs that modify backend or database code get:
- An isolated database using the `boardsesh-dev-db` Docker image (full board data, seed users)
- A dedicated backend container on the homelab
- Frontend preview connected to the branch backend via `getBackendWsUrl()` host-derived routing
- Automatic cleanup when the PR is closed/merged
- Sweep job catches anything the cleanup misses

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
- Branch deploys only need: dev-db container + backend container
- Frontend previews connect to branch backend via `getBackendWsUrl()`
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

3. **Set up external cron triggers** - Use GitHub Actions scheduled workflow to hit the backend sync endpoints:
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
- Branch backends don't need to sync with Aurora API (they use snapshot data from the dev-db image)
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

**Implementation:** The `dorny/paths-filter` step from Phase 1 (Section 1.3) drives this matrix. Each downstream job has an `if` condition based on the filter outputs. The deploy job invokes the Ansible playbook on a self-hosted runner.

---

## Cost & Complexity Analysis

### Phase 1 (Frontend-Only)

| Item | Cost | Complexity |
|------|------|------------|
| Vercel preview deploys | Free (included in plan) | Minimal - one `vercel.json` change |
| GitHub Actions minutes | Free tier (~2000 min/month) | Low - simple workflow |
| **Total** | **$0/month** | **~1-2 days** |

### Phase 2 (Full-Stack on Homelab)

| Item | Cost | Complexity |
|------|------|------------|
| Docker containers on homelab | $0 (resources already provisioned) | Medium - Ansible role |
| Cloudflare Tunnel routing | $0 (existing tunnel) | Low - config addition |
| Traefik dynamic routing | $0 (existing Traefik) | Low - template per PR |
| GitHub Actions (self-hosted runner) | $0 | Medium - workflow setup |
| **Total** | **$0/month** | **~3-5 days** |

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
| Preview deploys create stale sessions on production backend | Low | Low | Sessions auto-expire via TTL (existing `autoEndInterval` in `packages/backend/src/server.ts:294`) |

### Phase 2

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Docker resource exhaustion on boardsesh-daemon VM | Low | Medium | Max 5-8 concurrent PRs, resource limits per container, ~700MB per PR |
| Stale environments not cleaned up | Low | Medium | Sweep on every push to main + daily cron at 3am |
| Cloudflare Tunnel downtime | Low | Low | PR backends unreachable temporarily; acceptable for dev environments |
| Homelab outage | Low | Low | PR environments temporarily unavailable; acceptable for dev environments |
| Port conflicts | Very Low | Medium | Deterministic formula (`10000 + PR number`) eliminates conflicts |
| PR number exceeds port range | Very Low | Low | GitHub PR numbers are sequential; 10000+N stays well within valid port range for typical repos |

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

### BoardSesh repo

| File | Relevance |
|------|-----------|
| `docs/branch-deploys.md` | This document |
| `packages/web/app/lib/backend-url.ts` | Runtime WS URL resolver (prerequisite: update pattern + wire into call sites) |
| `packages/backend/src/handlers/cors.ts` | CORS config (already allows Vercel previews) |
| `packages/backend/src/handlers/join.ts` | Existing `backendUrl` query param pattern |
| `packages/backend/src/handlers/sync.ts` | User sync cron endpoint |
| `packages/backend/src/server.ts` | All backend HTTP routes, session cleanup |
| `packages/backend/Dockerfile` | Backend container build |
| `packages/aurora-sync/` | Shared sync library used by both web and backend |
| `vercel.json` | Build command (migration skip), cron definitions |
| `.github/workflows/branch-deploy.yml` | Triggers Ansible deploy on PR open/sync |
| `.github/workflows/branch-deploy-cleanup.yml` | Triggers Ansible cleanup on PR close |
| `.github/workflows/branch-deploy-sweep.yml` | Triggers Ansible sweep on push to main / daily |
| `.github/workflows/dev-db-docker.yml` | Existing path-filtered CI for DB changes |
| `.github/workflows/test.yml` | Existing CI for web package |
| `packages/web/app/api/internal/` | 12 route files to eventually migrate (Phase 3) |
| `packages/web/app/api/v1/` | 16 route files to eventually migrate (Phase 3) |

### Ansible repo (`blackheathdc-ansible`)

| File | Relevance |
|------|-----------|
| `roles/boardsesh_branch_deploy/` | New role for PR environments |
| `playbooks/manage_branch_deploys.yml` | New playbook (deploy/cleanup/sweep) |
| `roles/boardsesh_daemon/defaults/main.yml` | UFW port range for PR containers |
| `roles/boardsesh_daemon/templates/docker-compose.yml.j2` | Reference for PR compose template |
| `roles/traefik/templates/traefik.yml.j2:75` | File provider `watch: true` |
| `group_vars/services.yml:578-591` | Production boardsesh service definition |
| `inventories/hosts.yml` | boardsesh-daemon VM at `172.16.0.10` |
| cloudflared config | `*.ws.preview.boardsesh.com` ingress rule |
| `.github/workflows/deploy.yml` | Existing deploy pattern (prior art for self-hosted runners) |
