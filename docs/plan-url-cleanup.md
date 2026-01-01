# Plan: Cleanup Old Number-Based URLs

## Overview

This plan outlines the steps to remove support for the legacy number-based URL format entirely, leaving only the slug-based URLs. Currently, the app supports both formats with automatic redirects from numeric to slug URLs.

**Current formats:**
- Old (numeric): `/kilter/5/10/1,2,3/45/view/abc123`
- New (slugs): `/kilter/original/12x12/main_aux/45/view/test-climb-abc123`

## Impact Analysis

### Files Requiring Changes

#### 1. URL Utilities (`packages/web/app/lib/url-utils.ts`)

**Functions to remove:**
- `parseBoardRouteParams()` - Parses numeric IDs from URL params (lines 13-38)
- `constructClimbViewUrl()` - Builds URLs with numeric IDs (lines 211-224)
- `constructClimbList()` - Builds list URL with numeric IDs (lines 260-261)
- `constructPlayUrl()` - Builds play URL with numeric IDs (lines 426-438)
- `constructClimbSearchUrl()` - Uses numeric IDs in API paths (lines 263-266)
- `constructSetterStatsUrl()` - Uses numeric IDs in API paths (lines 268-274)
- `isNumericId()` - Detection helper no longer needed (line 417)
- `isSlugFormat()` - Detection helper no longer needed (lines 421-423)

**Functions to keep (rename for clarity):**
- `constructClimbViewUrlWithSlugs()` → `constructClimbViewUrl()`
- `constructClimbListWithSlugs()` → `constructClimbList()`
- `constructPlayUrlWithSlugs()` → `constructPlayUrl()`

#### 2. Server URL Utilities (`packages/web/app/lib/url-utils.server.ts`)

**Changes needed:**
- Remove `isNumericId` import and all numeric detection branches
- `parseBoardRouteParamsWithSlugs()` - Remove numeric fallback logic (lines 27-30, 45-46, 57-58, 96-97, 114-115, 126-127)
- Simplify to only handle slug lookups

#### 3. Page Components with Redirect Logic

Remove `hasNumericParams` detection and `permanentRedirect()` blocks from:

| File | Lines |
|------|-------|
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/layout.tsx` | 62-68, 100-106 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/view/[climb_uuid]/page.tsx` | 86-133 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/list/page.tsx` | 24-66 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/list/layout.tsx` | 22-28 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/create/page.tsx` | 23-33 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/play/[climb_uuid]/page.tsx` | 37-50 |
| `app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/play/layout.tsx` | 19-25 |

#### 4. Client Components Using Legacy Functions

**Components calling `constructClimbViewUrl()` (numeric):**
- `app/components/climb-actions/use-climb-actions.ts` (lines 10, 69)
- `app/components/climb-actions/actions/view-details-action.tsx` (lines 11, 37)
- `app/components/climb-actions/actions/share-action.tsx` (lines 10, 36)
- `app/components/climb-card/climb-thumbnail.tsx` (lines 6, 38)
- `app/components/queue-control/queue-list-item.tsx` (lines 17, 126)

These need to be refactored to use `constructClimbViewUrlWithSlugs()` and receive the required metadata (layout name, size name, set names, etc.).

#### 5. Types (`packages/web/app/lib/types.ts`)

Review if `ParsedBoardRouteParameters` type needs updating:
- Currently expects numeric `layout_id`, `size_id`, `set_ids`
- May need new type `SlugBoardRouteParameters` with string slugs
- Consider if we need both representations internally

#### 6. API Routes

These API routes use numeric IDs in their paths and need evaluation:
- `/api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/setters/route.ts`
- `/api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/heatmap/route.ts`
- `/api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/[climb_uuid]/route.ts`

**Decision needed:** Should API routes also migrate to slug-based paths, or keep numeric for internal use?

#### 7. Tests

**Files requiring updates:**
- `app/lib/__tests__/url-utils.test.ts` - Remove tests for deprecated functions
- `app/lib/__tests__/url-utils.server.test.ts` - Update parsing tests
- `app/lib/__tests__/slug-utils.test.ts` - May need updates

---

## Implementation Steps

### Phase 1: Preparation

1. **Add deprecation warnings** (optional)
   - Log warnings when numeric URLs are accessed before removing support
   - Helps identify any remaining traffic using old URLs

2. **Audit external links**
   - Check if any external documentation, README files, or shared links use numeric URLs
   - Update any external references

### Phase 2: Refactor Client Components

3. **Update component architecture for slug-based URLs**

   The challenge: Components like `climb-thumbnail.tsx` and `queue-list-item.tsx` currently receive `ParsedBoardRouteParameters` which only has numeric IDs. They need layout/size/set names to construct slug URLs.

   Options:
   - **Option A**: Pass additional metadata props (layout name, size name, set names)
   - **Option B**: Create a context that provides this metadata
   - **Option C**: Fetch metadata on client (not recommended - adds latency)

   **Recommended: Option A** - Pass board metadata as props alongside route params

4. **Create new unified URL construction interface**
   ```typescript
   interface BoardContext {
     board_name: string;
     layout: { id: number; name: string };
     size: { id: number; name: string; description?: string };
     sets: { id: number; name: string }[];
     angle: number;
   }
   ```

5. **Update components one by one:**
   - `climb-thumbnail.tsx`
   - `queue-list-item.tsx`
   - `use-climb-actions.ts`
   - `view-details-action.tsx`
   - `share-action.tsx`

### Phase 3: Remove Legacy URL Construction

6. **Rename slug functions** (in `url-utils.ts`)
   - `constructClimbViewUrlWithSlugs` → `constructClimbViewUrl`
   - `constructClimbListWithSlugs` → `constructClimbList`
   - `constructPlayUrlWithSlugs` → `constructPlayUrl`

7. **Remove deprecated functions**
   - Old `constructClimbViewUrl`, `constructClimbList`, `constructPlayUrl`
   - `parseBoardRouteParams` (if no longer needed)
   - `isNumericId`, `isSlugFormat`

### Phase 4: Remove Redirect Logic from Pages

8. **Clean up page components**
   - Remove all `hasNumericParams` detection logic
   - Remove `permanentRedirect()` calls for numeric URLs
   - Keep UUID-only to slug+UUID redirects (for climb URLs)

### Phase 5: Update Server-Side Parsing

9. **Simplify `url-utils.server.ts`**
   - Remove numeric ID branches from `parseBoardRouteParamsWithSlugs()`
   - Remove `isNumericId` import
   - Function should only handle slug lookups

### Phase 6: Handle API Routes (Decision Required)

10. **Decide API route strategy**

    **Option A: Keep numeric API routes (Recommended)**
    - Internal API routes remain numeric for simplicity
    - Only user-facing page URLs use slugs
    - Less work, maintains backward compatibility for any API consumers

    **Option B: Migrate API routes to slugs**
    - More consistent but more work
    - Would require updating all API callers
    - May break any external API consumers

### Phase 7: Cleanup

11. **Update tests**
    - Remove tests for deprecated functions
    - Update tests for renamed functions
    - Ensure all edge cases still covered

12. **Remove dead code**
    - Any unused imports
    - Any unused types
    - Any orphaned utility functions

---

## Migration Considerations

### Breaking Changes

1. **Old URLs will return 404** instead of redirecting
   - Any bookmarked numeric URLs will break
   - Any shared links with numeric format will break
   - External backlinks using numeric format will break

### Mitigation Options

1. **Keep redirects permanently** (not full cleanup)
   - Simplest approach but doesn't fully clean up code

2. **Add 404 page with helpful message**
   - Detect if URL looks like old format
   - Display message explaining URL format change
   - Could even auto-redirect with client-side logic

3. **Maintain redirect routes separately**
   - Create dedicated redirect handlers in middleware
   - Keep redirect logic out of page components

---

## Recommended Approach

Given SEO and user experience concerns, I recommend a **hybrid cleanup**:

1. **Move redirect logic to middleware** instead of removing entirely
   - Keeps page components clean
   - Still supports old URLs for backward compatibility
   - Centralized redirect logic easier to maintain/remove later

2. **Remove legacy URL construction functions**
   - All new URLs are slug-based
   - No code generates numeric URLs anymore

3. **Keep internal API routes numeric**
   - Less disruption
   - Numeric IDs are fine for internal use

This approach achieves most of the cleanup benefits while maintaining backward compatibility.

---

## Files Summary

### To Modify
- `packages/web/app/lib/url-utils.ts`
- `packages/web/app/lib/url-utils.server.ts`
- `packages/web/app/components/climb-actions/use-climb-actions.ts`
- `packages/web/app/components/climb-actions/actions/view-details-action.tsx`
- `packages/web/app/components/climb-actions/actions/share-action.tsx`
- `packages/web/app/components/climb-card/climb-thumbnail.tsx`
- `packages/web/app/components/queue-control/queue-list-item.tsx`
- `packages/web/app/[board_name]/.../layout.tsx` (multiple)
- `packages/web/app/[board_name]/.../page.tsx` (multiple)
- `packages/web/app/lib/__tests__/url-utils.test.ts`
- `packages/web/middleware.ts` (if moving redirect logic here)

### Potentially to Modify
- `packages/web/app/lib/types.ts`
- `packages/web/app/api/v1/...` (if migrating API routes)

### To Keep Unchanged
- `packages/web/app/lib/slug-utils.ts` (reverse lookup functions still needed)
- `packages/web/app/lib/slug-matching.ts`
- `packages/web/app/api/v1/[board_name]/slugs/...` (slug lookup APIs still needed)

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Preparation | Low |
| Phase 2: Refactor Components | Medium-High (needs architecture decision) |
| Phase 3: Remove Legacy Functions | Low |
| Phase 4: Remove Redirect Logic | Low |
| Phase 5: Update Server Parsing | Low |
| Phase 6: API Routes | Low (if keeping numeric) |
| Phase 7: Cleanup | Low |

**Total: Medium complexity** - Most work is in Phase 2 refactoring components to receive the necessary metadata for slug construction.
