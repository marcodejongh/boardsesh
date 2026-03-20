# Branch Deploy Implementation Plan

This document describes the architecture and implementation plan for deploying PR-based preview environments on a home Proxmox cluster. Each open PR gets an isolated stack (web, backend, database, redis) accessible via `*.boardsesh.com` subdomains.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Infrastructure Prerequisites](#infrastructure-prerequisites)
- [URL Scheme & Routing](#url-scheme--routing)
- [Docker Images](#docker-images)
- [Docker Compose Template](#docker-compose-template)
- [Deploy Manager Script](#deploy-manager-script)
- [GitHub Actions Workflow](#github-actions-workflow)
- [Ansible Playbook Structure](#ansible-playbook-structure)
- [Traefik Configuration](#traefik-configuration)
- [Cloudflare Tunnel for External Access](#cloudflare-tunnel-for-external-access)
- [Tailscale Internal Access](#tailscale-internal-access)
- [Resource Limits & Cleanup](#resource-limits--cleanup)
- [Security Considerations](#security-considerations)
- [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

```
┌─────────────────────┐     PR opened/updated/closed
│   GitHub Actions     │─────────────────────────────────┐
│                      │                                 │
│  1. Build web image  │                                 │
│  2. Build backend    │                                 │
│  3. Push to GHCR     │                                 │
│  4. SSH to Proxmox   │                                 │
│     deploy host      │                                 │
└──────────────────────┘                                 │
                                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Proxmox VM: branch-deploy-host                                    │
│  (Docker, Traefik, Tailscale, cloudflared)                         │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Traefik (reverse proxy)                                      │  │
│  │   *.boardsesh.com → route by Host header                     │  │
│  │   pr-{N}.boardsesh.com        → web-pr-{N}:3000              │  │
│  │   pr-{N}-ws.boardsesh.com     → backend-pr-{N}:8080          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌── PR #42 stack ──────────┐  ┌── PR #57 stack ──────────┐       │
│  │ web-pr-42     :3000      │  │ web-pr-57     :3000      │       │
│  │ backend-pr-42 :8080      │  │ backend-pr-57 :8080      │       │
│  │ postgres-pr-42:5432      │  │ postgres-pr-57:5432      │       │
│  │ neon-proxy-pr-42:4444    │  │ neon-proxy-pr-57:4444    │       │
│  │ redis-pr-42   :6379      │  │ redis-pr-57   :6379      │       │
│  │ (isolated Docker network)│  │ (isolated Docker network)│       │
│  └──────────────────────────┘  └──────────────────────────┘       │
│                                                                    │
│  ┌── Cloudflare Tunnel ──┐  ┌── Tailscale ──────────────────┐    │
│  │ cloudflared            │  │ Tailscale node (MagicDNS)     │    │
│  │ Routes:                │  │ branch-deploy.ts.net           │    │
│  │  *.preview.boardsesh   │  │                               │    │
│  │  .com → Traefik        │  │ Accessible at:                │    │
│  └────────────────────────┘  │  pr-{N}.boardsesh.com via     │    │
│                               │  split DNS or /etc/hosts      │    │
│                               └───────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Docker Compose per PR on a single VM | Simplest for 5-10 deploys; no k8s overhead |
| Build location | GitHub Actions → GHCR | Keeps build load off home cluster |
| Trigger | PR events only (open, synchronize, close) | Automatic, no manual steps |
| Networking | Each PR gets isolated Docker network; Traefik routes by Host | No port conflicts, clean isolation |
| Internal access | Tailscale | Already in use, zero-config VPN |
| External access | Cloudflare Tunnel | Secure, no port forwarding needed |

---

## Infrastructure Prerequisites

### Proxmox VM Setup

Create a VM (or LXC with nested Docker support) with:

- **OS**: Debian 12 or Ubuntu 24.04
- **Resources**: 8+ CPU cores, 32GB RAM, 200GB SSD (for ~10 concurrent deploys)
- **Software**: Docker Engine, Docker Compose v2, Tailscale, cloudflared
- **Network**: Accessible from GitHub Actions via Tailscale or a bastion host

### Resource Budget Per Deploy

| Service | Memory | CPU | Disk |
|---------|--------|-----|------|
| Web (Next.js) | 512MB | 0.5 | ~200MB image |
| Backend (Node) | 256MB | 0.25 | ~150MB image |
| PostgreSQL (dev-db) | 1GB | 0.5 | ~1.5GB (data) |
| Neon Proxy | 128MB | 0.1 | ~50MB |
| Redis | 64MB | 0.1 | ~10MB |
| **Total per deploy** | **~2GB** | **~1.5** | **~2GB** |

At 10 concurrent deploys: ~20GB RAM, ~15 CPU cores, ~20GB disk. The 32GB/8-core spec provides headroom.

### GitHub Secrets Required

```
DEPLOY_HOST_SSH_KEY       # SSH private key for deploy user on the Proxmox VM
DEPLOY_HOST_ADDRESS       # Tailscale IP or hostname of the deploy VM
DEPLOY_HOST_USER          # SSH user (e.g., "deployer")
```

---

## URL Scheme & Routing

### Domain Strategy

Two domain patterns, one for each access method:

| Access | Web URL | WebSocket URL | Who |
|--------|---------|---------------|-----|
| Tailscale (internal) | `https://pr-{N}.boardsesh.com` | `wss://pr-{N}-ws.boardsesh.com/graphql` | Team members |
| Cloudflare (external) | `https://pr-{N}.preview.boardsesh.com` | `wss://pr-{N}-ws.preview.boardsesh.com/graphql` | External contributors |

Where `{N}` is the PR number.

### DNS Configuration

**For Tailscale access:**
- Option A: Tailscale Split DNS — configure `*.boardsesh.com` to resolve to the deploy VM's Tailscale IP in the Tailscale admin console
- Option B: Add entries to the homelab's DNS server (e.g., Pi-hole, AdGuard Home) pointing `*.boardsesh.com` to the VM's LAN IP
- Option C: Use Traefik with a wildcard DNS record in your home DNS pointing to the VM

**For Cloudflare access:**
- Cloudflare DNS: wildcard CNAME `*.preview.boardsesh.com` → Cloudflare Tunnel
- The tunnel routes to Traefik on the VM

---

## Docker Images

### New: Dockerfile.web

A new Dockerfile for the Next.js web app, built in GitHub Actions and pushed to GHCR.

**File: `Dockerfile.web`** (repository root)

```dockerfile
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
COPY packages/shared-schema/package*.json ./packages/shared-schema/
COPY packages/crypto/package*.json ./packages/crypto/
COPY packages/db/package*.json ./packages/db/
COPY packages/aurora-sync/package*.json ./packages/aurora-sync/
COPY packages/moonboard-ocr/package*.json ./packages/moonboard-ocr/
RUN npm ci

# Stage 2: Build the Next.js app
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/shared-schema/node_modules ./packages/shared-schema/node_modules
COPY --from=deps /app/packages/crypto/node_modules ./packages/crypto/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/aurora-sync/node_modules ./packages/aurora-sync/node_modules
COPY --from=deps /app/packages/moonboard-ocr/node_modules ./packages/moonboard-ocr/node_modules
COPY . .

# Build args for environment variables baked into the Next.js build
ARG NEXT_PUBLIC_WS_URL
ARG BASE_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV BASE_URL=$BASE_URL

# Skip Sentry source map upload in branch deploys
ENV SENTRY_SUPPRESS_TURBOPACK_WARNING=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@boardsesh/web

# Stage 3: Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app and dependencies
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "packages/web/server.js"]
```

> **Note**: This requires `output: 'standalone'` in `next.config.mjs`. This setting must be added:
> ```js
> const nextConfig = {
>   output: 'standalone',
>   // ... existing config
> };
> ```
> The standalone output creates a self-contained server that doesn't need `node_modules` at runtime. This is the recommended approach for Docker deployments of Next.js apps. The `standalone` output should be safe to add — Vercel ignores it and uses its own build pipeline.

### Existing: Dockerfile.backend

Already exists and works. Tagged per PR: `ghcr.io/marcodejongh/boardsesh-backend:pr-{N}`

### Existing: Dev DB Image

`ghcr.io/marcodejongh/boardsesh-dev-db:latest` — pulled directly, no build needed.

---

## Docker Compose Template

Each PR deploy uses a generated `docker-compose.pr-{N}.yml` file created by the deploy manager script.

**File: `infra/branch-deploy/docker-compose.branch.yml.tpl`**

```yaml
# Template — variables substituted by deploy-manager.sh
# PR_NUMBER, IMAGE_TAG, DEPLOY_DOMAIN, WS_DOMAIN

services:
  web:
    image: ghcr.io/marcodejongh/boardsesh-web:${IMAGE_TAG}
    container_name: web-pr-${PR_NUMBER}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://postgres:password@postgres:5432/main
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/main
      - BASE_URL=https://${DEPLOY_DOMAIN}
      - NEXTAUTH_SECRET=branch-deploy-secret-${PR_NUMBER}
      - NEXTAUTH_URL=https://${DEPLOY_DOMAIN}
      - NEXT_PUBLIC_WS_URL=wss://${WS_DOMAIN}/graphql
      - IRON_SESSION_PASSWORD={"1":"branch-deploy-session-${PR_NUMBER}"}
    depends_on:
      postgres:
        condition: service_healthy
      neon-proxy:
        condition: service_started
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    labels:
      - "traefik.enable=true"
      # Internal route (Tailscale)
      - "traefik.http.routers.web-pr-${PR_NUMBER}.rule=Host(`${DEPLOY_DOMAIN}`)"
      - "traefik.http.routers.web-pr-${PR_NUMBER}.entrypoints=websecure"
      - "traefik.http.routers.web-pr-${PR_NUMBER}.tls=true"
      - "traefik.http.routers.web-pr-${PR_NUMBER}.tls.certresolver=letsencrypt"
      - "traefik.http.services.web-pr-${PR_NUMBER}.loadbalancer.server.port=3000"
      # External route (Cloudflare)
      - "traefik.http.routers.web-ext-pr-${PR_NUMBER}.rule=Host(`pr-${PR_NUMBER}.preview.boardsesh.com`)"
      - "traefik.http.routers.web-ext-pr-${PR_NUMBER}.entrypoints=websecure"
      - "traefik.http.routers.web-ext-pr-${PR_NUMBER}.tls=true"
      - "traefik.http.routers.web-ext-pr-${PR_NUMBER}.tls.certresolver=letsencrypt"
      - "traefik.http.services.web-ext-pr-${PR_NUMBER}.loadbalancer.server.port=3000"
    networks:
      - pr-${PR_NUMBER}
      - traefik

  backend:
    image: ghcr.io/marcodejongh/boardsesh-backend:${IMAGE_TAG}
    container_name: backend-pr-${PR_NUMBER}
    restart: unless-stopped
    environment:
      - PORT=8080
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/main
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_SECRET=branch-deploy-secret-${PR_NUMBER}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    labels:
      - "traefik.enable=true"
      # Internal route
      - "traefik.http.routers.backend-pr-${PR_NUMBER}.rule=Host(`${WS_DOMAIN}`)"
      - "traefik.http.routers.backend-pr-${PR_NUMBER}.entrypoints=websecure"
      - "traefik.http.routers.backend-pr-${PR_NUMBER}.tls=true"
      - "traefik.http.routers.backend-pr-${PR_NUMBER}.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend-pr-${PR_NUMBER}.loadbalancer.server.port=8080"
      # External route
      - "traefik.http.routers.backend-ext-pr-${PR_NUMBER}.rule=Host(`pr-${PR_NUMBER}-ws.preview.boardsesh.com`)"
      - "traefik.http.routers.backend-ext-pr-${PR_NUMBER}.entrypoints=websecure"
      - "traefik.http.routers.backend-ext-pr-${PR_NUMBER}.tls=true"
      - "traefik.http.routers.backend-ext-pr-${PR_NUMBER}.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend-ext-pr-${PR_NUMBER}.loadbalancer.server.port=8080"
    networks:
      - pr-${PR_NUMBER}
      - traefik

  postgres:
    image: ghcr.io/marcodejongh/boardsesh-dev-db:latest
    container_name: postgres-pr-${PR_NUMBER}
    restart: unless-stopped
    shm_size: '256mb'
    command: postgres -c max_connections=100 -c log_min_messages=warning -c shared_buffers=128MB
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=main
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
    networks:
      - pr-${PR_NUMBER}

  neon-proxy:
    image: ghcr.io/timowilhelm/local-neon-http-proxy:main
    container_name: neon-proxy-pr-${PR_NUMBER}
    restart: unless-stopped
    environment:
      - PG_CONNECTION_STRING=postgres://postgres:password@postgres:5432/main
      - POSTGRES_DB=main
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.1'
    networks:
      - pr-${PR_NUMBER}

  redis:
    image: redis:7-alpine
    container_name: redis-pr-${PR_NUMBER}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: '0.1'
    networks:
      - pr-${PR_NUMBER}

networks:
  pr-${PR_NUMBER}:
    driver: bridge
  traefik:
    external: true
```

### Key Design Points

1. **Isolated networks**: Each PR stack runs in its own Docker network (`pr-{N}`). Services reference each other by service name (e.g., `postgres`, `redis`) — no port conflicts.
2. **Traefik network**: Web and backend containers also join the shared `traefik` network so the reverse proxy can reach them.
3. **No published ports**: Services don't expose ports to the host. All traffic goes through Traefik.
4. **Environment injection**: `NEXT_PUBLIC_WS_URL` is baked into the web image at build time (it's a client-side env var). Server-side env vars are set at container runtime.

---

## Deploy Manager Script

A shell script on the deploy host that manages the lifecycle of branch deploys.

**File: `infra/branch-deploy/deploy-manager.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deploy manager for branch deploys
# Usage:
#   deploy-manager.sh deploy <pr_number> <image_tag>
#   deploy-manager.sh destroy <pr_number>
#   deploy-manager.sh list
#   deploy-manager.sh cleanup <max_age_hours>

DEPLOY_DIR="/opt/branch-deploys"
TEMPLATE_DIR="/opt/branch-deploys/templates"
LOG_DIR="/var/log/branch-deploys"

mkdir -p "$DEPLOY_DIR" "$LOG_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_DIR/deploy-manager.log"
}

deploy() {
  local pr_number="$1"
  local image_tag="$2"
  local deploy_domain="pr-${pr_number}.boardsesh.com"
  local ws_domain="pr-${pr_number}-ws.boardsesh.com"
  local project_dir="$DEPLOY_DIR/pr-${pr_number}"

  log "Deploying PR #${pr_number} with image tag ${image_tag}"

  mkdir -p "$project_dir"

  # Generate docker-compose file from template
  export PR_NUMBER="$pr_number"
  export IMAGE_TAG="$image_tag"
  export DEPLOY_DOMAIN="$deploy_domain"
  export WS_DOMAIN="$ws_domain"

  envsubst < "$TEMPLATE_DIR/docker-compose.branch.yml.tpl" > "$project_dir/docker-compose.yml"

  # Pull latest images
  docker compose -f "$project_dir/docker-compose.yml" \
    -p "pr-${pr_number}" pull

  # Deploy (or update) the stack
  docker compose -f "$project_dir/docker-compose.yml" \
    -p "pr-${pr_number}" up -d --remove-orphans

  # Record deployment metadata
  cat > "$project_dir/metadata.json" <<EOF
{
  "pr_number": ${pr_number},
  "image_tag": "${image_tag}",
  "deployed_at": "$(date -Iseconds)",
  "web_url": "https://${deploy_domain}",
  "ws_url": "wss://${ws_domain}/graphql",
  "external_web_url": "https://pr-${pr_number}.preview.boardsesh.com",
  "external_ws_url": "wss://pr-${pr_number}-ws.preview.boardsesh.com/graphql"
}
EOF

  log "PR #${pr_number} deployed successfully"
  log "  Internal: https://${deploy_domain}"
  log "  External: https://pr-${pr_number}.preview.boardsesh.com"
}

destroy() {
  local pr_number="$1"
  local project_dir="$DEPLOY_DIR/pr-${pr_number}"

  log "Destroying PR #${pr_number} deploy"

  if [ -f "$project_dir/docker-compose.yml" ]; then
    docker compose -f "$project_dir/docker-compose.yml" \
      -p "pr-${pr_number}" down -v --remove-orphans
  fi

  rm -rf "$project_dir"

  # Prune dangling images to reclaim disk
  docker image prune -f --filter "label=pr=${pr_number}" 2>/dev/null || true

  log "PR #${pr_number} destroyed"
}

list_deploys() {
  echo "Active branch deploys:"
  echo "──────────────────────"
  for dir in "$DEPLOY_DIR"/pr-*/; do
    if [ -f "$dir/metadata.json" ]; then
      local pr=$(jq -r '.pr_number' "$dir/metadata.json")
      local deployed=$(jq -r '.deployed_at' "$dir/metadata.json")
      local url=$(jq -r '.web_url' "$dir/metadata.json")
      echo "  PR #${pr} | ${url} | deployed: ${deployed}"
    fi
  done
}

cleanup_stale() {
  local max_age_hours="${1:-72}"
  local cutoff
  cutoff=$(date -d "${max_age_hours} hours ago" +%s 2>/dev/null || date -v-${max_age_hours}H +%s)

  log "Cleaning up deploys older than ${max_age_hours} hours"

  for dir in "$DEPLOY_DIR"/pr-*/; do
    if [ -f "$dir/metadata.json" ]; then
      local deployed_at
      deployed_at=$(jq -r '.deployed_at' "$dir/metadata.json")
      local deployed_ts
      deployed_ts=$(date -d "$deployed_at" +%s 2>/dev/null || date -jf "%Y-%m-%dT%H:%M:%S" "$deployed_at" +%s)

      if [ "$deployed_ts" -lt "$cutoff" ]; then
        local pr
        pr=$(jq -r '.pr_number' "$dir/metadata.json")
        log "Stale deploy: PR #${pr} (deployed ${deployed_at})"
        destroy "$pr"
      fi
    fi
  done
}

case "${1:-}" in
  deploy)
    deploy "${2:?PR number required}" "${3:?Image tag required}"
    ;;
  destroy)
    destroy "${2:?PR number required}"
    ;;
  list)
    list_deploys
    ;;
  cleanup)
    cleanup_stale "${2:-72}"
    ;;
  *)
    echo "Usage: $0 {deploy|destroy|list|cleanup} [args...]"
    exit 1
    ;;
esac
```

---

## GitHub Actions Workflow

**File: `.github/workflows/branch-deploy.yml`**

```yaml
name: Branch Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

# Cancel in-progress deployments for the same PR
concurrency:
  group: branch-deploy-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  WEB_IMAGE: ghcr.io/${{ github.repository_owner }}/boardsesh-web
  BACKEND_IMAGE: ghcr.io/${{ github.repository_owner }}/boardsesh-backend

jobs:
  # ─── Build & Push Images ───────────────────────────────────────────
  build-images:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: pr-${{ github.event.pull_request.number }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.web
          push: true
          tags: |
            ${{ env.WEB_IMAGE }}:pr-${{ github.event.pull_request.number }}
            ${{ env.WEB_IMAGE }}:sha-${{ github.sha }}
          build-args: |
            NEXT_PUBLIC_WS_URL=wss://pr-${{ github.event.pull_request.number }}-ws.boardsesh.com/graphql
            BASE_URL=https://pr-${{ github.event.pull_request.number }}.boardsesh.com
          cache-from: |
            type=gha,scope=web-pr-${{ github.event.pull_request.number }}
            type=gha,scope=web-main
          cache-to: type=gha,mode=max,scope=web-pr-${{ github.event.pull_request.number }}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:pr-${{ github.event.pull_request.number }}
            ${{ env.BACKEND_IMAGE }}:sha-${{ github.sha }}
          cache-from: |
            type=gha,scope=backend-pr-${{ github.event.pull_request.number }}
            type=gha,scope=backend-main
          cache-to: type=gha,mode=max,scope=backend-pr-${{ github.event.pull_request.number }}

  # ─── Deploy to Proxmox ────────────────────────────────────────────
  deploy:
    if: github.event.action != 'closed'
    needs: build-images
    runs-on: ubuntu-latest
    environment:
      name: pr-${{ github.event.pull_request.number }}
      url: https://pr-${{ github.event.pull_request.number }}.boardsesh.com

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST_ADDRESS }}
          username: ${{ secrets.DEPLOY_HOST_USER }}
          key: ${{ secrets.DEPLOY_HOST_SSH_KEY }}
          script: |
            /opt/branch-deploys/deploy-manager.sh deploy \
              ${{ github.event.pull_request.number }} \
              pr-${{ github.event.pull_request.number }}

      - name: Comment deploy URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const body = `## 🚀 Branch Deploy Ready

            | | URL |
            |---|---|
            | **Web** | https://pr-${prNumber}.boardsesh.com |
            | **WebSocket** | wss://pr-${prNumber}-ws.boardsesh.com/graphql |
            | **External Web** | https://pr-${prNumber}.preview.boardsesh.com |
            | **External WS** | wss://pr-${prNumber}-ws.preview.boardsesh.com/graphql |

            _Deployed from commit ${context.sha.substring(0, 7)}_`;

            // Find existing bot comment to update
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });
            const botComment = comments.data.find(
              c => c.user.type === 'Bot' && c.body.includes('Branch Deploy Ready')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body,
              });
            }

  # ─── Cleanup on PR Close ──────────────────────────────────────────
  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest

    steps:
      - name: Destroy deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST_ADDRESS }}
          username: ${{ secrets.DEPLOY_HOST_USER }}
          key: ${{ secrets.DEPLOY_HOST_SSH_KEY }}
          script: |
            /opt/branch-deploys/deploy-manager.sh destroy \
              ${{ github.event.pull_request.number }}

      - name: Delete GHCR images
        uses: actions/github-script@v7
        continue-on-error: true
        with:
          script: |
            const prTag = `pr-${context.payload.pull_request.number}`;
            for (const pkg of ['boardsesh-web', 'boardsesh-backend']) {
              try {
                const versions = await github.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
                  package_type: 'container',
                  package_name: pkg,
                  org: context.repo.owner,
                });
                const version = versions.data.find(v =>
                  v.metadata?.container?.tags?.includes(prTag)
                );
                if (version) {
                  await github.rest.packages.deletePackageVersionForOrg({
                    package_type: 'container',
                    package_name: pkg,
                    org: context.repo.owner,
                    package_version_id: version.id,
                  });
                }
              } catch (e) {
                console.log(`Could not clean up ${pkg}:${prTag}: ${e.message}`);
              }
            }
```

### Workflow Behavior

| PR Event | Action |
|----------|--------|
| `opened` | Build images → push to GHCR → deploy stack → comment URL |
| `synchronize` (new push) | Rebuild images → redeploy (compose pulls new images, recreates containers) |
| `reopened` | Same as `opened` |
| `closed` / merged | Destroy stack → delete volumes → clean up GHCR images |

---

## Ansible Playbook Structure

Ansible provisions the deploy host VM. Add to your existing Ansible repository:

```
ansible/
  roles/
    branch-deploy-host/
      tasks/
        main.yml
      templates/
        docker-compose.branch.yml.tpl.j2
        deploy-manager.sh.j2
        traefik-static.yml.j2
        cloudflared-config.yml.j2
      files/
        stale-deploy-cleanup.timer
        stale-deploy-cleanup.service
      handlers/
        main.yml
```

### Main Tasks (`roles/branch-deploy-host/tasks/main.yml`)

```yaml
---
- name: Install Docker and Docker Compose
  ansible.builtin.include_role:
    name: geerlingguy.docker
  vars:
    docker_users:
      - "{{ deploy_user }}"

- name: Install required packages
  ansible.builtin.apt:
    name:
      - jq
      - gettext-base  # for envsubst
    state: present

- name: Create deploy directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0755'
  loop:
    - /opt/branch-deploys
    - /opt/branch-deploys/templates
    - /var/log/branch-deploys

- name: Deploy docker-compose template
  ansible.builtin.template:
    src: docker-compose.branch.yml.tpl.j2
    dest: /opt/branch-deploys/templates/docker-compose.branch.yml.tpl
    owner: "{{ deploy_user }}"
    mode: '0644'

- name: Deploy manager script
  ansible.builtin.template:
    src: deploy-manager.sh.j2
    dest: /opt/branch-deploys/deploy-manager.sh
    owner: "{{ deploy_user }}"
    mode: '0755'

- name: Create shared Traefik network
  community.docker.docker_network:
    name: traefik
    state: present

- name: Configure Traefik
  ansible.builtin.template:
    src: traefik-static.yml.j2
    dest: /opt/traefik/traefik.yml
    owner: root
    mode: '0644'
  notify: restart traefik

- name: Run Traefik container
  community.docker.docker_container:
    name: traefik
    image: traefik:v3.2
    restart_policy: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard (optional, restrict access)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - /opt/traefik/acme:/acme
    networks:
      - name: traefik

- name: Log in to GHCR
  community.docker.docker_login:
    registry: ghcr.io
    username: "{{ ghcr_username }}"
    password: "{{ ghcr_token }}"

# Tailscale (if not already managed by another role)
- name: Install Tailscale
  ansible.builtin.include_role:
    name: artis3n.tailscale
  vars:
    tailscale_authkey: "{{ tailscale_auth_key }}"

# Cloudflare Tunnel
- name: Install cloudflared
  ansible.builtin.apt:
    deb: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    state: present

- name: Configure cloudflared
  ansible.builtin.template:
    src: cloudflared-config.yml.j2
    dest: /etc/cloudflared/config.yml
    owner: root
    mode: '0600'
  notify: restart cloudflared

- name: Enable cloudflared service
  ansible.builtin.systemd:
    name: cloudflared
    enabled: true
    state: started

# Stale deploy cleanup cron (systemd timer)
- name: Install stale deploy cleanup timer
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/systemd/system/
    mode: '0644'
  loop:
    - stale-deploy-cleanup.timer
    - stale-deploy-cleanup.service
  notify: reload systemd

- name: Enable stale deploy cleanup timer
  ansible.builtin.systemd:
    name: stale-deploy-cleanup.timer
    enabled: true
    state: started
```

### Systemd Timer for Stale Cleanup

**`stale-deploy-cleanup.timer`**
```ini
[Unit]
Description=Clean up stale branch deploys

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**`stale-deploy-cleanup.service`**
```ini
[Unit]
Description=Clean up branch deploys older than 72 hours

[Service]
Type=oneshot
ExecStart=/opt/branch-deploys/deploy-manager.sh cleanup 72
User=deployer
```

### Ansible Variables

```yaml
# group_vars/branch_deploy.yml
deploy_user: deployer
ghcr_username: marcodejongh
ghcr_token: "{{ vault_ghcr_token }}"
tailscale_auth_key: "{{ vault_tailscale_auth_key }}"
cloudflare_tunnel_token: "{{ vault_cloudflare_tunnel_token }}"
cloudflare_tunnel_id: "{{ vault_cloudflare_tunnel_id }}"
acme_email: "your-email@example.com"  # For Let's Encrypt
```

---

## Traefik Configuration

**File: `traefik-static.yml` (Ansible template)**

```yaml
# Traefik static configuration
api:
  dashboard: true
  insecure: true  # Dashboard on :8080 — restrict via Tailscale ACLs

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik

certificatesResolvers:
  letsencrypt:
    acme:
      email: "{{ acme_email }}"
      storage: /acme/acme.json
      # Use DNS challenge for wildcard certs (recommended)
      # If using Cloudflare for DNS:
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
      # Alternative: HTTP challenge (no wildcard, but simpler)
      # httpChallenge:
      #   entryPoint: web

# Environment variables needed for Cloudflare DNS challenge:
#   CF_DNS_API_TOKEN=<your-cloudflare-api-token>
```

### TLS Strategy

- **Recommended**: Use Cloudflare DNS challenge with a wildcard cert for `*.boardsesh.com` and `*.preview.boardsesh.com`. This means a single cert covers all PR subdomains.
- **Alternative**: Use HTTP challenge per subdomain (slower on first request, but no Cloudflare API token needed for the cert).

### Traefik Environment Variables

The Traefik container needs the Cloudflare API token for DNS challenge:

```yaml
# In the Ansible task for the Traefik container, add:
env:
  CF_DNS_API_TOKEN: "{{ vault_cloudflare_dns_api_token }}"
```

---

## Cloudflare Tunnel for External Access

### Setup Steps

1. Create a Cloudflare Tunnel in the Cloudflare Zero Trust dashboard
2. Note the tunnel ID and token
3. Configure DNS: CNAME `*.preview.boardsesh.com` → `<tunnel-id>.cfargotunnel.com`

### Cloudflared Config

**File: `/etc/cloudflared/config.yml` (Ansible template)**

```yaml
tunnel: {{ cloudflare_tunnel_id }}
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # Wildcard route: all *.preview.boardsesh.com traffic → Traefik
  - hostname: "*.preview.boardsesh.com"
    service: https://localhost:443
    originRequest:
      noTLSVerify: true  # Traefik handles TLS internally
  # Catch-all (required by cloudflared)
  - service: http_status:404
```

### How It Works

1. External contributor visits `https://pr-42.preview.boardsesh.com`
2. Cloudflare DNS resolves to the Cloudflare Tunnel
3. `cloudflared` on the deploy host receives the request
4. Forwards to Traefik at `localhost:443`
5. Traefik matches the `Host` header and routes to the correct PR container

### WebSocket Support

Cloudflare Tunnels support WebSocket natively. The `wss://pr-42-ws.preview.boardsesh.com/graphql` endpoint works without additional configuration.

---

## Tailscale Internal Access

### Setup

1. Install Tailscale on the deploy VM (handled by Ansible)
2. The VM appears in your tailnet as `branch-deploy` (or whatever hostname you set)

### DNS Options for `*.boardsesh.com` Resolution on Tailnet

**Option A: Tailscale Split DNS (recommended)**
- In Tailscale admin console → DNS → Add nameserver
- Set the deploy VM as a nameserver for `boardsesh.com`
- Run a lightweight DNS server (e.g., dnsmasq or CoreDNS) on the VM that resolves `*.boardsesh.com` to `127.0.0.1` (localhost on the VM)

**Option B: Homelab DNS (Pi-hole / AdGuard / Unbound)**
- Add a wildcard DNS record: `*.boardsesh.com` → VM's LAN IP
- This works for devices on the home network without Tailscale

**Option C: MagicDNS + /etc/hosts**
- Each developer adds entries to `/etc/hosts` pointing PR subdomains to the VM's Tailscale IP
- Simple but manual; not recommended for teams

### Recommended: dnsmasq on the Deploy VM

```bash
# /etc/dnsmasq.d/boardsesh.conf
address=/boardsesh.com/100.x.y.z  # VM's Tailscale IP
```

Then configure Tailscale split DNS to use the VM for `boardsesh.com` lookups.

---

## Resource Limits & Cleanup

### Automatic Cleanup

1. **PR closed/merged**: GitHub Actions triggers `deploy-manager.sh destroy` (immediate)
2. **Stale deploys**: Systemd timer runs `deploy-manager.sh cleanup 72` daily (catches orphaned deploys if the webhook fails)
3. **Docker image pruning**: `deploy-manager.sh destroy` prunes dangling images; a weekly `docker system prune` cron handles the rest

### Resource Protection

```bash
# /etc/docker/daemon.json — prevent any single container from consuming all resources
{
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 65536, "Soft": 65536 }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Max Deploy Limit

Add to `deploy-manager.sh` in the `deploy()` function:

```bash
# Check max deploys
MAX_DEPLOYS=12
current_count=$(find "$DEPLOY_DIR" -maxdepth 1 -name "pr-*" -type d | wc -l)
if [ "$current_count" -ge "$MAX_DEPLOYS" ]; then
  log "ERROR: Maximum deploys ($MAX_DEPLOYS) reached. Refusing to deploy PR #${pr_number}."
  exit 1
fi
```

---

## Security Considerations

### Network Isolation

- Each PR stack runs in its own Docker bridge network
- Services can only reach each other within their stack (except via Traefik)
- No host ports are published — all traffic routes through Traefik

### Secrets

- Branch deploy secrets (`NEXTAUTH_SECRET`, `IRON_SESSION_PASSWORD`) are deterministic but unique per PR — acceptable for previews
- For production-grade secrets, use Vault or GitHub Environments with required reviewers
- The deploy host's SSH key should have restricted permissions (deploy user only, no sudo)

### External Access (Cloudflare Tunnel)

- Cloudflare Access can be layered on top to require authentication for external previews
- Consider enabling Cloudflare Access policies for `*.preview.boardsesh.com` that require GitHub OAuth — this lets external contributors authenticate but prevents random access

### GHCR Image Access

- The deploy host needs a GHCR token (PAT or fine-grained token) with `read:packages` scope
- Store it as an Ansible Vault secret

---

## Implementation Checklist

### Phase 1: Infrastructure Setup (Ansible)

- [ ] Create Proxmox VM for branch deploys (Debian 12, 8 cores, 32GB RAM)
- [ ] Install Docker Engine + Docker Compose v2
- [ ] Install Tailscale and join tailnet
- [ ] Install and configure cloudflared
- [ ] Set up Traefik with wildcard TLS
- [ ] Deploy `deploy-manager.sh` and compose template
- [ ] Create `deployer` user with Docker access and SSH key
- [ ] Configure GHCR authentication
- [ ] Set up DNS (Tailscale split DNS or homelab DNS)
- [ ] Configure Cloudflare DNS: `*.preview.boardsesh.com` CNAME → tunnel

### Phase 2: Docker Images

- [ ] Create `Dockerfile.web` for the Next.js app
- [ ] Add `output: 'standalone'` to `next.config.mjs`
- [ ] Test both Dockerfiles build correctly locally
- [ ] Verify the web Docker image works with the dev-db image

### Phase 3: GitHub Actions

- [ ] Add `DEPLOY_HOST_SSH_KEY`, `DEPLOY_HOST_ADDRESS`, `DEPLOY_HOST_USER` secrets
- [ ] Create `.github/workflows/branch-deploy.yml`
- [ ] Test the full deploy cycle: open PR → see deploy → push → see update → close → see cleanup

### Phase 4: Validation & Polish

- [ ] Verify internal access via Tailscale
- [ ] Verify external access via Cloudflare Tunnel
- [ ] Verify WebSocket connections work through both paths
- [ ] Test concurrent deploys (open 3+ PRs simultaneously)
- [ ] Verify cleanup on PR close removes all resources
- [ ] Set up stale deploy cleanup timer
- [ ] Add Cloudflare Access policy for external previews (optional)

### Phase 5: Scaling (Future)

- [ ] If >10 concurrent deploys needed: add a second VM, use a shared Traefik instance or load balancer
- [ ] Consider pre-pulling the dev-db image to reduce deploy time
- [ ] Add monitoring/alerting for the deploy host (disk, memory, container count)
- [ ] Add a status page showing all active branch deploys
