# GitHub Organization Migration Plan

Migrate the Boardsesh repository from `github.com/marcodejongh/boardsesh` to `github.com/boardsesh/boardsesh`.

## Prerequisites

- [ ] Create the `boardsesh` GitHub organization (if not already done)
- [ ] Ensure you have owner permissions on both the personal account repo and the org
- [ ] Ensure no org repo named `boardsesh` already exists
- [ ] Note: GitHub Free org plan is sufficient for public repos

---

## Phase 1: Pre-Migration Preparation

### 1.1 Inventory of External Services

Document current integrations and their configuration:

| Service | Current Config | Action Required |
|---------|---------------|-----------------|
| **Vercel** | Linked to `marcodejongh/boardsesh` | Reconnect to new repo |
| **Codecov** | Token in GitHub Secrets | Reconnect + new token |
| **Claude Code Actions** | `CLAUDE_CODE_OAUTH_TOKEN` secret | Re-add secret to org |
| **GHCR (Container Registry)** | Images under `ghcr.io/marcodejongh/` | Images will be at `ghcr.io/boardsesh/` |
| **Dependabot** | Configured in `.github/dependabot.yml` | Auto-works after transfer |

### 1.2 Backup (Optional but Recommended)

```bash
# Full mirror clone as backup
git clone --mirror git@github.com:marcodejongh/boardsesh.git boardsesh-backup.git
```

---

## Phase 2: Repository Transfer

GitHub's built-in transfer feature handles the heavy lifting:

1. Go to **Settings → General → Danger Zone → Transfer repository**
2. Select the `boardsesh` organization as the new owner
3. Type the repo name to confirm

### What GitHub Handles Automatically

- All git history, branches, tags preserved
- Issues, PRs, discussions, releases transferred
- Old URL (`github.com/marcodejongh/boardsesh`) redirects to new URL
- Collaborators with personal access retain access
- Stars and watchers preserved
- GitHub Actions workflows continue working (they use `${{ github.repository_owner }}` for GHCR image names, so no changes needed)

### What Breaks

- Existing forks stay pointed at the old location (they'll still work via redirect, but can be re-pointed)
- Webhook URLs may need re-configuration
- GitHub Secrets do **not** transfer — they must be re-created on the org

---

## Phase 3: Post-Transfer Configuration

### 3.1 Re-add GitHub Secrets

Go to **Organization Settings → Secrets and variables → Actions** (or repo-level settings) and add:

- [ ] `CLAUDE_CODE_OAUTH_TOKEN` — Claude Code Actions bot
- [ ] `CODECOV_TOKEN` — Test coverage reporting
- [ ] Any deployment-related secrets (Vercel tokens, etc.)

`GITHUB_TOKEN` is automatic and requires no action.

### 3.2 Reconnect Vercel

Two approaches:

**Option A — Transfer Vercel project (preferred)**
1. In Vercel dashboard, go to Project Settings → Git
2. Disconnect the old repo
3. Connect to `boardsesh/boardsesh`
4. Verify environment variables are intact
5. Trigger a deployment to confirm

**Option B — If using Vercel Teams**
If you create a Vercel team for the org, you may need to transfer the Vercel project to the team as well.

Note: The Vercel preview URL pattern will change (see Phase 4, CORS update).

### 3.3 Reconnect Codecov

1. Go to [codecov.io](https://codecov.io)
2. Add the `boardsesh` org
3. Enable the `boardsesh` repo
4. Update the upload token in GitHub Secrets

### 3.4 Rebuild GHCR Images

After transfer, the CI will publish images to `ghcr.io/boardsesh/` (the workflows already use `${{ github.repository_owner }}`). Trigger a rebuild:

```bash
# Trigger dev-db image rebuild
gh workflow run dev-db-docker.yml

# Trigger board-controller image rebuild
gh workflow run board-controller-docker.yml
```

Old images at `ghcr.io/marcodejongh/` will remain accessible but won't receive updates.

---

## Phase 4: Code Updates

These are all the hardcoded references to `marcodejongh` in the codebase that need updating.

### 4.1 Docker Image References

Update `ghcr.io/marcodejongh/` → `ghcr.io/boardsesh/` in:

| File | Line | Image |
|------|------|-------|
| `docker-compose.yml` | 3 | `boardsesh-dev-db` |
| `.github/workflows/e2e-tests.yml` | 29 | `boardsesh-dev-db` |
| `.github/workflows/backend-tests.yml` | 24 | `boardsesh-postgres-postgis` |
| `packages/web/board-controller/docker-compose.yml` | 5 | `boardsesh-board-controller` |
| `packages/backend/README.md` | 105 | `boardsesh-backend` |
| `packages/web/board-controller/README.md` | 386, 389 | `boardsesh-board-controller` |

### 4.2 GitHub URL References

Update `github.com/marcodejongh/boardsesh` → `github.com/boardsesh/boardsesh` in:

| File | Description |
|------|-------------|
| `packages/web/app/about/about-content.tsx` | About page GitHub link |
| `packages/web/app/components/setup-wizard/consolidated-board-config.tsx` | Setup wizard GitHub link |
| `packages/web/app/lib/api-docs/generate-openapi.ts` | OpenAPI spec contact URL |
| `packages/web/board-controller/README.md` | `raw.githubusercontent.com` URL |
| `packages/backend/MIGRATION_PLAN.md` | PR link |
| `docs/esp32-ota-implementation-plan.md` | Firmware release URLs |
| `embedded/libs/waveshare-display/library.json` | PlatformIO repository URL |
| `embedded/libs/lilygo-display/library.json` | PlatformIO repository URL |
| `embedded/libs/display-base/library.json` | PlatformIO repository URL |

### 4.3 CLAUDE.md References

Update `ghcr.io/marcodejongh/boardsesh-dev-db` → `ghcr.io/boardsesh/boardsesh-dev-db` in:

| File | Lines |
|------|-------|
| `CLAUDE.md` | 34, 68 |

### 4.4 Vercel Preview CORS Pattern

The Vercel preview URL regex contains `marcodejonghs-projects` which is derived from the personal account. After moving to an org, Vercel preview URLs will use the org's Vercel scope name instead. Update:

| File | Line | Current Pattern |
|------|------|----------------|
| `packages/backend/src/handlers/cors.ts` | 4-5 | `marcodejonghs-projects` |
| `packages/backend/src/__tests__/cors.test.ts` | 127, 138, 144 | `marcodejonghs-projects` |

**Important**: Determine the exact Vercel scope/team name first. If the Vercel team is named `boardsesh`, the pattern becomes:
```
boardsesh-[hash]-boardseshs-projects.vercel.app
```
Deploy a preview branch after reconnecting Vercel to confirm the exact URL format before updating the regex.

### 4.5 Quick Find-and-Replace Commands

After determining the correct Vercel preview pattern:

```bash
# Docker image references
grep -rl 'ghcr.io/marcodejongh/' . --include='*.yml' --include='*.yaml' --include='*.md' --include='*.ts' --include='*.tsx' | \
  xargs sed -i 's|ghcr.io/marcodejongh/|ghcr.io/boardsesh/|g'

# GitHub URLs
grep -rl 'github.com/marcodejongh/boardsesh' . --include='*.ts' --include='*.tsx' --include='*.md' --include='*.json' | \
  xargs sed -i 's|github.com/marcodejongh/boardsesh|github.com/boardsesh/boardsesh|g'

# raw.githubusercontent URLs
grep -rl 'raw.githubusercontent.com/marcodejongh/boardsesh' . --include='*.md' | \
  xargs sed -i 's|raw.githubusercontent.com/marcodejongh/boardsesh|raw.githubusercontent.com/boardsesh/boardsesh|g'

# CORS pattern (replace NEW_SCOPE with actual Vercel scope)
# sed -i 's/marcodejonghs-projects/NEW_SCOPE/g' packages/backend/src/handlers/cors.ts
# sed -i 's/marcodejonghs-projects/NEW_SCOPE/g' packages/backend/src/__tests__/cors.test.ts
```

---

## Phase 5: Verification Checklist

### Immediate (after transfer)

- [ ] `github.com/boardsesh/boardsesh` loads correctly
- [ ] `github.com/marcodejongh/boardsesh` redirects properly
- [ ] GitHub Actions tab is visible and workflows are listed
- [ ] Branch protections are intact

### After re-adding secrets

- [ ] Push a commit and verify CI workflows pass (lint, typecheck, tests)
- [ ] Verify GHCR images publish to `ghcr.io/boardsesh/`
- [ ] Verify Codecov receives coverage reports

### After Vercel reconnection

- [ ] Production deployment succeeds
- [ ] Preview deployments work
- [ ] Cron jobs are running (check Vercel dashboard)
- [ ] Note the new preview URL pattern for CORS update

### After code updates

- [ ] `npm run typecheck` passes
- [ ] `npm run db:up` pulls the new image successfully
- [ ] Backend CORS allows the new Vercel preview URLs
- [ ] About page links point to new org URL
- [ ] OpenAPI spec has correct contact URL

### Local development

- [ ] Existing local clones still work (git remote auto-redirects, but update explicitly):
  ```bash
  git remote set-url origin git@github.com:boardsesh/boardsesh.git
  ```

---

## Phase 6: Cleanup

- [ ] Delete old GHCR images from `ghcr.io/marcodejongh/` (optional, they'll just be stale)
- [ ] Update any external documentation, blog posts, or forum links
- [ ] Notify contributors to update their remotes
- [ ] Update any bookmarks or CI/CD in other repos that reference the old URL

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub redirect expires | Low (redirects are long-lived) | Medium | Update all references promptly |
| Vercel deployment breaks | Medium | High | Test reconnection before updating DNS |
| CI fails due to missing secrets | High (expected) | Low | Re-add secrets immediately after transfer |
| CORS blocks preview deployments | Medium | Low | Deploy CORS fix before or immediately after |
| Docker pull fails for local devs | Medium | Low | Rebuild images, notify devs to pull new tags |

## Estimated Effort

- **Phase 1-2** (transfer): ~15 minutes
- **Phase 3** (service reconnection): ~30 minutes
- **Phase 4** (code updates): ~15 minutes (mostly find-and-replace)
- **Phase 5** (verification): ~30 minutes
- **Total**: ~1.5 hours
