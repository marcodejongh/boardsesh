# useEffect Audit & Refactoring Guide

This document catalogs every `useEffect` in the codebase, classifies each one, and provides concrete recommendations for replacing code-smell instances with better React patterns.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Classification Legend](#classification-legend)
- [Priority 1: Derived State (Replace with useMemo / Compute During Render)](#priority-1-derived-state)
- [Priority 2: Prop Syncing (Anti-Pattern - Remove the Effect)](#priority-2-prop-syncing)
- [Priority 3: Data Fetching (Replace with React Query / SWR / Server Components)](#priority-3-data-fetching)
- [Acceptable: Sync with External System](#acceptable-sync-with-external-system)
- [Acceptable: Event Subscriptions](#acceptable-event-subscriptions)
- [Acceptable: Navigation / Routing Side Effects](#acceptable-navigation--routing-side-effects)
- [Acceptable: Animation / Timers](#acceptable-animation--timers)
- [Acceptable: Legitimate Lifecycle](#acceptable-legitimate-lifecycle)
- [Full Inventory Table](#full-inventory-table)
- [Recommended Refactoring Patterns](#recommended-refactoring-patterns)

---

## Executive Summary

The codebase contains **~130 useEffect calls** across **~55 files** (excluding vendored/minified bundles). After analysis, they break down as follows:

| Classification | Count | Action Required |
|---|---|---|
| Derived state | ~18 | **Replace** with `useMemo` or compute during render |
| Prop syncing (anti-pattern) | ~12 | **Remove** the effect; assign refs in render or derive values |
| Data fetching | ~25 | **Replace** with React Query / SWR or server components |
| Sync with external system | ~20 | Keep (legitimate) |
| Event subscriptions | ~12 | Keep (legitimate) |
| Navigation/routing side effects | ~10 | Keep (legitimate) |
| Animation/timers | ~10 | Keep (legitimate) |
| Legitimate lifecycle | ~23 | Keep (legitimate) |

Roughly **42% of effects are legitimate** and should stay. The remaining **58%** are candidates for refactoring, with derived state and prop syncing being the highest-priority fixes.

---

## Classification Legend

| Category | Smell Level | Description |
|---|---|---|
| **Derived state** | High | Computing state from other state/props via `useEffect` + `setState`. Should use `useMemo` or compute inline during render. |
| **Prop syncing** | High | Copying props into state, or syncing refs with state via effects. The state is redundant - derive it directly. |
| **Data fetching** | Medium | Fetching data in effects. Works but is fragile (no caching, no dedup, no race condition handling). Use React Query or server components. |
| **Sync with external system** | Low/None | Managing browser APIs (IndexedDB, Web Bluetooth, Wake Lock, DOM). This is what `useEffect` is designed for. |
| **Event subscription** | Low/None | Subscribing to events (WebSocket, IntersectionObserver, media queries). Legitimate. |
| **Navigation/routing** | Low/None | Redirects, scroll restoration, URL syncing. Legitimate. |
| **Animation/timer** | Low/None | `setInterval`/`setTimeout` for animations. Legitimate. |
| **Legitimate lifecycle** | None | Mount initialization, cleanup on unmount. Exactly what effects are for. |

---

## Priority 1: Derived State

These effects compute values from existing state/props and store them in state. They cause unnecessary re-renders (effect fires *after* render, then `setState` triggers a *second* render).

### `consolidated-board-config.tsx` — Cascading State Chain (Critical)

**Lines 93, 182, 196, 216, 241, 254** — Six effects that cascade: board -> layout -> size -> sets -> suggested name. Each `setState` call triggers the next effect, causing up to 6 sequential re-renders.

**Current pattern:**
```tsx
// Effect 1: board changes → auto-select layout
useEffect(() => {
  const availableLayouts = boardConfigs.layouts[selectedBoard] || [];
  setSelectedLayout(availableLayouts[0]?.id);
  setSelectedSize(undefined);
  setSelectedSets([]);
}, [selectedBoard, boardConfigs]);

// Effect 2: layout changes → auto-select size
useEffect(() => {
  const defaultSizeId = getDefaultSizeForLayout(selectedBoard, selectedLayout);
  setSelectedSize(defaultSizeId);
  setSelectedSets([]);
}, [selectedBoard, selectedLayout]);

// Effect 3: size changes → auto-select sets
useEffect(() => {
  const availableSets = boardConfigs.sets[key] || [];
  setSelectedSets(availableSets.map(s => s.id));
}, [selectedBoard, selectedLayout, selectedSize, boardConfigs]);
```

**Recommended replacement — Single reducer with derived state:**
```tsx
type BoardConfigState = {
  board: BoardName | null;
  layoutId: number | undefined;
  sizeId: number | undefined;
  setIds: number[];
};

function boardConfigReducer(state: BoardConfigState, action: Action): BoardConfigState {
  switch (action.type) {
    case 'SELECT_BOARD': {
      const layouts = action.boardConfigs.layouts[action.board] || [];
      const layoutId = layouts[0]?.id;
      const sizeId = layoutId ? getDefaultSizeForLayout(action.board, layoutId) : undefined;
      const sets = sizeId
        ? (action.boardConfigs.sets[`${action.board}-${layoutId}-${sizeId}`] || [])
        : [];
      return { board: action.board, layoutId, sizeId, setIds: sets.map(s => s.id) };
    }
    case 'SELECT_LAYOUT': { /* similar cascade logic */ }
    case 'SELECT_SIZE': { /* similar cascade logic */ }
    // ...
  }
}

// Derived values computed during render:
const previewBoardDetails = useMemo(() => {
  if (!state.board || !state.layoutId || !state.sizeId || state.setIds.length === 0) return null;
  return getBoardDetails({ board_name: state.board, layout_id: state.layoutId, ... });
}, [state.board, state.layoutId, state.sizeId, state.setIds]);

const suggestedName = useMemo(() =>
  generateName(state.board, state.layoutId, state.sizeId),
  [state.board, state.layoutId, state.sizeId]
);
```

### `board-selector-drawer.tsx` — Same Cascading Pattern

**Lines 81, 99, 116** — Three effects mirroring the cascade in `consolidated-board-config.tsx`.

**Recommendation:** Extract shared reducer/hook (e.g. `useBoardConfigCascade`) used by both components.

### `board-config-preview.tsx` (Line 36) and `board-config-live-preview.tsx` (Line 37)

**Current:** `useEffect` that synchronously computes board details and sets state.
**Recommendation:** Replace with `useMemo`:
```tsx
const boardDetails = useMemo(() => {
  if (!hasRequiredProps) return null;
  try {
    return getBoardDetails({ board_name: boardName, layout_id: layoutId, ... });
  } catch { return null; }
}, [hasRequiredProps, boardName, layoutId, sizeId, setIds, boardConfigs]);
```

### `persistent-session-context.tsx` (Line 452) — State Hash as Derived Value

**Current:** Effect computes hash from `queue` and `currentClimbQueueItem`, stores in state.
**Recommendation:** Use `useMemo`:
```tsx
const computedStateHash = useMemo(
  () => computeQueueStateHash(queue, currentClimbQueueItem),
  [queue, currentClimbQueueItem]
);
```

### `create-climb-heatmap-overlay.tsx` (Line 48) — Debounced Derived Value

**Current:** `useEffect` with `setTimeout` to debounce `litUpHoldsMap`.
**Recommendation:** Use the existing `useDebouncedValue` hook:
```tsx
const debouncedHoldsMap = useDebouncedValue(litUpHoldsMap, 500);
```

### `use-queue-data-fetching.tsx` (Line 174) — First-Fetch Flag

**Current:** Effect sets `hasDoneFirstFetch` when search results arrive.
**Recommendation:** Derive inline:
```tsx
const hasDoneFirstFetch = climbSearchResults !== undefined && climbSearchResults !== null;
```

---

## Priority 2: Prop Syncing

These effects copy props/state into refs or local state. The effect is redundant — just assign during render.

### `persistent-session-context.tsx` — Ref Syncing (Lines 222-232, 291-297)

**Five effects** that each do nothing but `someRef.current = someValue`:

```tsx
// Current (repeated 5 times)
useEffect(() => { wsAuthTokenRef.current = wsAuthToken; }, [wsAuthToken]);
useEffect(() => { usernameRef.current = username; }, [username]);
useEffect(() => { avatarUrlRef.current = avatarUrl; }, [avatarUrl]);
useEffect(() => { sessionRef.current = session; }, [session]);
useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
```

**Recommendation — Assign during render:**
```tsx
// No effect needed. Refs can be assigned during render.
wsAuthTokenRef.current = wsAuthToken;
usernameRef.current = username;
avatarUrlRef.current = avatarUrl;
sessionRef.current = session;
activeSessionRef.current = activeSession;
```

This is safe because ref assignments are side-effect-free (they don't trigger re-renders) and will always reflect the latest value.

### `use-queue-session.ts` — Callback Ref Syncing (Lines 135-146)

**Three effects** syncing callback refs:
```tsx
useEffect(() => { onQueueEventRef.current = onQueueEvent; }, [onQueueEvent]);
useEffect(() => { onSessionEventRef.current = onSessionEvent; }, [onSessionEvent]);
useEffect(() => { sessionRef.current = session; }, [session]);
```

**Recommendation:** Same as above — assign during render. This is a well-known pattern endorsed by the React team (sometimes called "latest ref" pattern).

### `vote-button.tsx` (Line 62) — Syncing Batch Data to State

**Current:** Effect copies `batchSummary` and `initialUserVote` into local state.
**Recommendation:** Use the batch data directly, or initialize with `useState` using a lazy initializer and handle updates with a key prop on the component.

### `logascent-form.tsx` (Line 77) — Resetting Form on Climb Change

**Current:** Effect resets form state when `currentClimb` changes.
**Recommendation:** Use a `key` prop on the form component to force remount on climb change:
```tsx
<LogAscentForm key={currentClimb.uuid} currentClimb={currentClimb} />
```

### `playlist-edit-drawer.tsx` (Line 73) — Resetting Form on Drawer Open

**Current:** Effect resets form values when `open` or `playlist` changes.
**Recommendation:** Use a `key` prop:
```tsx
<PlaylistEditDrawer key={playlist?.uuid ?? 'new'} open={open} playlist={playlist} />
```

### `library-page-content.tsx` (Line 93) and `playlist-detail-content.tsx` (Line 118)

**Current:** Effect auto-selects a board from the loaded boards list.
**Recommendation:** Derive `selectedBoard` with `useMemo`:
```tsx
const selectedBoard = useMemo(() => {
  if (boardsLoading || !myBoards?.length) return null;
  return myBoards.find(b => b.slug === boardSlug) ?? myBoards[0] ?? null;
}, [myBoards, boardsLoading, boardSlug]);
```

---

## Priority 3: Data Fetching

These effects fetch data from APIs. They work but lack caching, deduplication, background revalidation, and proper loading/error states that libraries provide out of the box.

The project already uses React Query (`@tanstack/react-query`) in some places. All data-fetching effects should migrate to it for consistency.

### High-Volume Offenders

| File | Line | What It Fetches | Recommendation |
|---|---|---|---|
| `profile-page-content.tsx` | 346, 351, 356, 361 | Profile, ticks, stats, logbook | 4 separate `useQuery` calls |
| `library-page-content.tsx` | 213, 217 | User data, discover data | `useQuery` with conditional keys |
| `playlist-detail-content.tsx` | 156 | Playlist details | `useQuery` |
| `settings-page-content.tsx` | 86 | User profile | `useQuery` conditional on auth |
| `setter-profile-content.tsx` | 50 | Setter profile | `useQuery` |
| `admin/page.tsx` | 24 | Admin role check | `useQuery` |
| `vote-button.tsx` | 78 | Vote summary | `useQuery` with batch context fallback |
| `proposal-section.tsx` | 93 | Proposals | `useQuery` |
| `comment-list.tsx` | 70 | Comments | `useQuery` |
| `use-heatmap.tsx` | 33 | Heatmap data | `useQuery` with `enabled` flag |
| `board-selector-pills.tsx` | 55 | User boards | `useQuery` (or share with `use-my-boards`) |
| `board-detail.tsx` | 97 | Board details | `useQuery` |
| `board-leaderboard.tsx` | 83 | Leaderboard | `useQuery` |
| `controllers-section.tsx` | 239 | ESP32 controllers | `useQuery` |
| `aurora-credentials-section.tsx` | 199 | Aurora credentials | `useQuery` |
| `social-login-buttons.tsx` | 63 | OAuth providers | `useQuery` |
| `build-climb-detail-sections.tsx` | 25 | Beta links | `useQuery` |
| `play-view-beta-slider.tsx` | 39 | Beta video links | `useQuery` |
| `gym-member-management.tsx` | 66 | Gym members | `useInfiniteQuery` |
| `role-management.tsx` | 75, 80 | Roles, user search | `useQuery` + `useDebouncedValue` |
| `community-settings-panel.tsx` | 66 | Community settings | `useQuery` |
| `gym-detail.tsx` | 83 | Gym details | `useQuery` |
| `hold-classification-wizard.tsx` | 174 | Hold classifications | `useQuery` |
| `swagger-ui.tsx` | 28 | OpenAPI spec | `useQuery` |
| `use-my-boards.ts` | 27 | User boards | `useQuery` |
| `join-session-tab.tsx` | 46 | Nearby sessions | `useQuery` |
| `start-climbing-button.tsx` | 167 | Climbing URL generation | `useMemo` (synchronous) or `useQuery` |

### Example Migration

**Before (manual effect):**
```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  fetch(`/api/internal/profile`)
    .then(res => res.json())
    .then(data => { if (!cancelled) setData(data); })
    .catch(err => { if (!cancelled) setError(err); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [userId]);
```

**After (React Query):**
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['profile', userId],
  queryFn: () => fetch(`/api/internal/profile`).then(res => res.json()),
  enabled: !!userId,
});
```

### Server Component Candidates

Some data fetching can be moved entirely to server components (initial page loads):

- `profile-page-content.tsx` — Profile, stats, ticks can be fetched server-side in the page component
- `setter-profile-content.tsx` — Setter profile can be a server component
- `swagger-ui.tsx` — OpenAPI spec fetch can happen server-side
- `admin/page.tsx` — Admin role check can use server-side session

---

## Acceptable: Sync with External System

These are **legitimate** uses of `useEffect` for synchronizing with browser APIs and external systems.

| File | Line | External System | Notes |
|---|---|---|---|
| `persistent-session-context.tsx` | 531 | WebSocket (graphql-ws) | Main connection lifecycle. Large but well-structured. Consider extracting into `useGraphQLSubscription` hook. |
| `use-wake-lock.ts` | 63 | Wake Lock API | Proper acquire/release lifecycle |
| `use-wake-lock.ts` | 77 | `visibilitychange` event | Re-acquire wake lock on page visibility |
| `use-board-bluetooth.ts` | 179 | Web Bluetooth | Cleanup device listeners |
| `bluetooth-context.tsx` | 47 | Web Bluetooth | Send climb frames to board |
| `create-climb-form.tsx` | 160 | Web Bluetooth | Send frames on hold change |
| `color-mode-provider.tsx` | 18 | IndexedDB + DOM `data-*` | Load theme preference |
| `last-used-board-tracker.tsx` | 27 | IndexedDB | Persist last-used board |
| `climbs-list.tsx` | 73 | IndexedDB | Load view mode preference |
| `liked-climbs-list.tsx` | 58 | IndexedDB | Load view mode preference |
| `user-drawer.tsx` | 63 | IndexedDB | Load recent sessions |
| `board-selector-drawer.tsx` | 72 | IndexedDB | Load saved boards |
| `board-creation-banner.tsx` | 47 | IndexedDB | Check dismissal state |
| `use-always-tick-in-app.ts` | 8 | IndexedDB | Load preference |
| `connection-settings-context.tsx` | 32 | IndexedDB | Load party mode preference |
| `consolidated-board-config.tsx` | 150 | DOM (`<link>` prefetch) | Prefetch board images |
| `consolidated-board-config.tsx` | 168 | IndexedDB | Load saved configurations |
| `global-error.tsx` | 12 | Sentry | Report error |
| `settings-page-content.tsx` | 93 | Blob URL | Cleanup `URL.revokeObjectURL` |
| `recent-search-pills.tsx` | 20 | IndexedDB + custom event | Load + subscribe to changes |
| `search-drawer-bridge-context.tsx` | 128 | Context registration | Register/deregister callbacks |

---

## Acceptable: Event Subscriptions

| File | Line | Subscription | Notes |
|---|---|---|---|
| `queue-list.tsx` | 88 | Drag-and-drop monitor | `@atlaskit/pragmatic-drag-and-drop` |
| `queue-list.tsx` | 155 | IntersectionObserver | Infinite scroll sentinel |
| `queue-list-item.tsx` | 240 | Drag-and-drop adapters | Per-item DnD setup |
| `queue-control-bar.tsx` | 70 | Custom DOM event | `TOUR_DRAWER_EVENT` |
| `comment-section.tsx` | 38 | WebSocket subscription | Real-time comment updates |
| `comment-list.tsx` | 118 | IntersectionObserver | Infinite scroll |
| `use-notification-subscription.ts` | 52 | WebSocket subscription | Real-time notifications |
| `use-logbook.ts` | 178 | React Query cache | Subscribe to cache events |
| `use-infinite-scroll.ts` | 56 | IntersectionObserver | Generic infinite scroll hook |
| `use-geolocation.ts` | 42 | Permissions API | Listen for permission changes |
| `action-tooltip.tsx` | 21 | Media query | Touch device detection |
| `new-climb-feed.tsx` | 90 | WebSocket subscription | New climb real-time feed |
| `QueueContext.tsx` | 279 | Persistent session events | Queue event subscription |

---

## Acceptable: Navigation / Routing Side Effects

| File | Line | Purpose |
|---|---|---|
| `queue-control-bar.tsx` | 53 | Close drawers on navigation |
| `board-session-bridge.tsx` | 46 | Activate session from URL param |
| `settings-page-content.tsx` | 79 | Redirect if unauthenticated |
| `auth-page-content.tsx` | 109 | Redirect if already authenticated |
| `auth-page-content.tsx` | 91, 102 | Show toast from URL query params |
| `back-button.tsx` | 17, 43 | Detect history, prefetch fallback |
| `board-page-climbs-list.tsx` | 38 | Scroll to top on page reset |
| `play-view-drawer.tsx` | 190 | Hash-based back button support |
| `QueueContext.tsx` | 118, 126, 132 | Sync session ID with URL |

---

## Acceptable: Animation / Timers

| File | Line | Purpose |
|---|---|---|
| `queue-control-bar.tsx` | 252 | Clear enter animation after duration |
| `swipe-board-carousel.tsx` | 63 | Fallback animation timeout |
| `board-heatmap.tsx` | 132 | Loading sweep animation |
| `full-page-loading-overlay.tsx` | 27 | Rotate loading messages |
| `animated-board-loading.tsx` | 83, 96 | Message rotation + hold animation |
| `use-debounced-value.ts` | 13 | Debounce timer |
| `persistent-session-context.tsx` | 858 | Periodic hash verification (60s) |
| `QueueContext.tsx` | 348 | Orphaned pending update cleanup |

---

## Acceptable: Legitimate Lifecycle

| File | Line | Purpose |
|---|---|---|
| `queue-control-bar.tsx` | 58 | Clear timeout refs on unmount |
| `queue-bridge-context.tsx` | 378, 394 | Two-phase injection (layout + effect) |
| `use-queue-session.ts` | 149 | WebSocket connection + subscriptions |
| `persistent-session-context.tsx` | 300 | Clean up old queues (mount) |
| `persistent-session-context.tsx` | 307 | Clear save timer (unmount) |
| `persistent-session-context.tsx` | 318 | Auto-restore session (mount) |
| `party-profile-context.tsx` | 38 | Load party profile (mount) |
| `session-history-panel.tsx` | 33 | Load session history (mount) |
| `use-wake-lock.ts` | 21 | Feature detection (mount) |
| `use-board-bluetooth.ts` | 179 | Cleanup listeners (unmount) |
| `board-provider-context.tsx` | 42 | Initialize on session ready |
| `moonboard-edit-modal.tsx` | 117 | Reset state on modal open |
| `onboarding-tour.tsx` | 152 | Show tour on first visit |
| `playlist-generator-drawer.tsx` | 59 | Reset state on drawer open/close |
| `play-view-drawer.tsx` | 183 | Reset height on drawer close |
| `liked-climbs-list.tsx` | 113 | Show error snackbar |
| `QueueContext.tsx` | 172, 193 | Restore queue from IndexedDB/session |
| `QueueContext.tsx` | 240 | Clear queue on board change |
| `QueueContext.tsx` | 248 | Persist queue to IndexedDB |
| `QueueContext.tsx` | 399 | Trigger resync on corruption |
| `proposal-card.tsx` | 68 | Scroll highlighted card into view |
| `angle-selector.tsx` | 51 | Scroll current angle into view |

---

## Full Inventory Table

| # | File | Line | Classification | Refactor? |
|---|---|---|---|---|
| 1 | `consolidated-board-config.tsx` | 93 | Derived state | Yes — useMemo |
| 2 | `consolidated-board-config.tsx` | 150 | Sync external (DOM) | No |
| 3 | `consolidated-board-config.tsx` | 168 | Legitimate lifecycle | No |
| 4 | `consolidated-board-config.tsx` | 182 | Derived state | Yes — initial state |
| 5 | `consolidated-board-config.tsx` | 196 | Derived state | Yes — reducer |
| 6 | `consolidated-board-config.tsx` | 216 | Derived state | Yes — reducer |
| 7 | `consolidated-board-config.tsx` | 241 | Derived state | Yes — reducer |
| 8 | `consolidated-board-config.tsx` | 254 | Derived state | Yes — useMemo |
| 9 | `board-selector-drawer.tsx` | 72 | Sync external (IDB) | No |
| 10 | `board-selector-drawer.tsx` | 81 | Derived state | Yes — reducer |
| 11 | `board-selector-drawer.tsx` | 99 | Derived state | Yes — reducer |
| 12 | `board-selector-drawer.tsx` | 116 | Derived state | Yes — reducer |
| 13 | `board-config-preview.tsx` | 36 | Derived state | Yes — useMemo |
| 14 | `board-config-live-preview.tsx` | 37 | Derived state | Yes — useMemo |
| 15 | `persistent-session-context.tsx` | 222 | Prop syncing | Yes — render assign |
| 16 | `persistent-session-context.tsx` | 226 | Prop syncing | Yes — render assign |
| 17 | `persistent-session-context.tsx` | 230 | Prop syncing | Yes — render assign |
| 18 | `persistent-session-context.tsx` | 291 | Prop syncing | Yes — render assign |
| 19 | `persistent-session-context.tsx` | 295 | Prop syncing | Yes — render assign |
| 20 | `persistent-session-context.tsx` | 300 | Legitimate lifecycle | No |
| 21 | `persistent-session-context.tsx` | 307 | Legitimate lifecycle | No |
| 22 | `persistent-session-context.tsx` | 318 | Legitimate lifecycle | No |
| 23 | `persistent-session-context.tsx` | 452 | Derived state | Yes — useMemo |
| 24 | `persistent-session-context.tsx` | 531 | Sync external (WS) | No (extract hook) |
| 25 | `persistent-session-context.tsx` | 858 | Timer | No |
| 26 | `persistent-session-context.tsx` | 889 | Derived state | Yes — useMemo |
| 27 | `use-queue-session.ts` | 135 | Prop syncing | Yes — render assign |
| 28 | `use-queue-session.ts` | 139 | Prop syncing | Yes — render assign |
| 29 | `use-queue-session.ts` | 144 | Prop syncing | Yes — render assign |
| 30 | `use-queue-session.ts` | 149 | Legitimate lifecycle | No |
| 31 | `QueueContext.tsx` | 118 | Prop syncing | Acceptable (URL sync) |
| 32 | `QueueContext.tsx` | 126 | Prop syncing | Acceptable (session sync) |
| 33 | `QueueContext.tsx` | 132 | Navigation | No |
| 34 | `QueueContext.tsx` | 172 | Legitimate lifecycle | No |
| 35 | `QueueContext.tsx` | 193 | Legitimate lifecycle | No |
| 36 | `QueueContext.tsx` | 240 | Legitimate lifecycle | No |
| 37 | `QueueContext.tsx` | 248 | Sync external (IDB) | No |
| 38 | `QueueContext.tsx` | 279 | Event subscription | No |
| 39 | `QueueContext.tsx` | 348 | Timer | No |
| 40 | `QueueContext.tsx` | 399 | Legitimate lifecycle | No |
| 41 | `queue-list.tsx` | 88 | Sync external (DnD) | No |
| 42 | `queue-list.tsx` | 155 | Event subscription | No |
| 43 | `queue-list-item.tsx` | 240 | Sync external (DnD) | No |
| 44 | `queue-control-bar.tsx` | 53 | Navigation | No |
| 45 | `queue-control-bar.tsx` | 58 | Legitimate lifecycle | No |
| 46 | `queue-control-bar.tsx` | 70 | Event subscription | No |
| 47 | `queue-control-bar.tsx` | 252 | Animation | No |
| 48 | `queue-bridge-context.tsx` | 378 | Legitimate lifecycle | No |
| 49 | `queue-bridge-context.tsx` | 394 | Legitimate lifecycle | No |
| 50 | `use-queue-data-fetching.tsx` | 162 | Data fetching | Medium — useQuery trigger |
| 51 | `use-queue-data-fetching.tsx` | 174 | Derived state | Yes — derive inline |
| 52 | `vote-button.tsx` | 62 | Prop syncing | Yes — derive or key |
| 53 | `vote-button.tsx` | 78 | Data fetching | Yes — useQuery |
| 54 | `proposal-section.tsx` | 93 | Data fetching | Yes — useQuery |
| 55 | `proposal-card.tsx` | 68 | Legitimate lifecycle | No |
| 56 | `comment-section.tsx` | 38 | Event subscription | No |
| 57 | `comment-list.tsx` | 70 | Data fetching | Yes — useQuery |
| 58 | `comment-list.tsx` | 118 | Event subscription | No |
| 59 | `search-drawer-bridge-context.tsx` | 128 | Sync external | No |
| 60 | `search-drawer-bridge-context.tsx` | 138 | Prop syncing | Acceptable (context sync) |
| 61 | `use-heatmap.tsx` | 33 | Data fetching | Yes — useQuery |
| 62 | `recent-search-pills.tsx` | 20 | Sync external (IDB) | No |
| 63 | `board-selector-pills.tsx` | 55 | Data fetching | Yes — useQuery |
| 64 | `board-detail.tsx` | 97 | Data fetching | Yes — useQuery |
| 65 | `board-creation-banner.tsx` | 47 | Sync external (IDB) | No |
| 66 | `board-leaderboard.tsx` | 83 | Data fetching | Yes — useQuery |
| 67 | `board-heatmap.tsx` | 132 | Animation | No |
| 68 | `profile-page-content.tsx` | 346 | Data fetching | Yes — useQuery |
| 69 | `profile-page-content.tsx` | 351 | Data fetching | Yes — useQuery |
| 70 | `profile-page-content.tsx` | 356 | Data fetching | Yes — useQuery |
| 71 | `profile-page-content.tsx` | 361 | Data fetching | Yes — useQuery |
| 72 | `library-page-content.tsx` | 88 | Legitimate lifecycle | No |
| 73 | `library-page-content.tsx` | 93 | Prop syncing | Yes — useMemo |
| 74 | `library-page-content.tsx` | 213 | Data fetching | Yes — useQuery |
| 75 | `library-page-content.tsx` | 217 | Data fetching | Yes — useQuery |
| 76 | `playlist-detail-content.tsx` | 118 | Prop syncing | Yes — useMemo |
| 77 | `playlist-detail-content.tsx` | 156 | Data fetching | Yes — useQuery |
| 78 | `playlist-detail-content.tsx` | 161 | Legitimate lifecycle | No |
| 79 | `global-error.tsx` | 12 | Sync external (Sentry) | No |
| 80 | `settings-page-content.tsx` | 79 | Navigation | No |
| 81 | `settings-page-content.tsx` | 86 | Data fetching | Yes — useQuery |
| 82 | `settings-page-content.tsx` | 93 | Sync external (Blob) | No |
| 83 | `setter-profile-content.tsx` | 50 | Data fetching | Yes — useQuery / SSR |
| 84 | `user-search-dialog.tsx` | 51 | Data fetching | Yes — useQuery + useDebouncedValue |
| 85 | `auth-page-content.tsx` | 91 | Navigation | No |
| 86 | `auth-page-content.tsx` | 102 | Navigation | No |
| 87 | `auth-page-content.tsx` | 109 | Navigation | No |
| 88 | `admin/page.tsx` | 24 | Data fetching | Yes — useQuery / SSR |
| 89 | `use-notification-subscription.ts` | 52 | Event subscription | No |
| 90 | `use-my-boards.ts` | 27 | Data fetching | Yes — useQuery |
| 91 | `use-logbook.ts` | 155 | Derived state / sync | Medium — complex merge |
| 92 | `use-logbook.ts` | 178 | Event subscription | No |
| 93 | `use-logbook.ts` | 207 | Sync external | No |
| 94 | `use-infinite-scroll.ts` | 56 | Event subscription | No |
| 95 | `use-geolocation.ts` | 42 | Sync external | No |
| 96 | `use-debounced-value.ts` | 13 | Timer | No |
| 97 | `use-always-tick-in-app.ts` | 8 | Sync external (IDB) | No |
| 98 | `user-drawer.tsx` | 63 | Sync external (IDB) | No |
| 99 | `controllers-section.tsx` | 239 | Data fetching | Yes — useQuery |
| 100 | `aurora-credentials-section.tsx` | 199 | Data fetching | Yes — useQuery |
| 101 | `last-used-board-tracker.tsx` | 27 | Sync external (IDB) | No |
| 102 | `climbs-list.tsx` | 73 | Sync external (IDB) | No |
| 103 | `angle-selector.tsx` | 51 | Legitimate lifecycle | No |
| 104 | `board-page-climbs-list.tsx` | 38 | Navigation | No |
| 105 | `board-provider-context.tsx` | 42 | Legitimate lifecycle | No |
| 106 | `social-login-buttons.tsx` | 63 | Data fetching | Yes — useQuery |
| 107 | `build-climb-detail-sections.tsx` | 25 | Data fetching | Yes — useQuery |
| 108 | `back-button.tsx` | 17 | Ref-based DOM | No |
| 109 | `back-button.tsx` | 43 | Navigation | No |
| 110 | `color-mode-provider.tsx` | 18 | Sync external (IDB) | No |
| 111 | `gym-member-management.tsx` | 66 | Data fetching | Yes — useQuery |
| 112 | `role-management.tsx` | 75 | Data fetching | Yes — useQuery |
| 113 | `role-management.tsx` | 80 | Data fetching | Yes — useQuery + debounce |
| 114 | `community-settings-panel.tsx` | 66 | Data fetching | Yes — useQuery |
| 115 | `gym-detail.tsx` | 83 | Data fetching | Yes — useQuery |
| 116 | `logascent-form.tsx` | 77 | Prop syncing | Yes — key prop |
| 117 | `full-page-loading-overlay.tsx` | 27 | Animation | No |
| 118 | `animated-board-loading.tsx` | 83 | Animation | No |
| 119 | `animated-board-loading.tsx` | 96 | Animation | No |
| 120 | `climb-actions.tsx` | 325 | Legitimate lifecycle | No |
| 121 | `action-tooltip.tsx` | 21 | Event subscription | No |
| 122 | `playlist-generator-drawer.tsx` | 59 | Legitimate lifecycle | No |
| 123 | `play-view-drawer.tsx` | 183 | Legitimate lifecycle | No |
| 124 | `play-view-drawer.tsx` | 190 | Navigation | No |
| 125 | `play-view-beta-slider.tsx` | 39 | Data fetching | Yes — useQuery |
| 126 | `playlist-edit-drawer.tsx` | 73 | Prop syncing | Yes — key prop |
| 127 | `hold-classification-wizard.tsx` | 174 | Data fetching | Yes — useQuery |
| 128 | `onboarding-tour.tsx` | 66 | Legitimate lifecycle | No |
| 129 | `onboarding-tour.tsx` | 152 | Legitimate lifecycle | No |
| 130 | `create-climb-form.tsx` | 160 | Sync external (BT) | No |
| 131 | `create-climb-heatmap-overlay.tsx` | 48 | Derived state | Yes — useDebouncedValue |
| 132 | `new-climb-feed.tsx` | 90 | Event subscription | No |
| 133 | `party-profile-context.tsx` | 38 | Legitimate lifecycle | No |
| 134 | `party-profile-context.tsx` | 65 | Data fetching | Medium — useQuery |
| 135 | `board-session-bridge.tsx` | 46 | Navigation | No |
| 136 | `liked-climbs-list.tsx` | 58 | Sync external (IDB) | No |
| 137 | `liked-climbs-list.tsx` | 113 | Legitimate lifecycle | No |
| 138 | `swagger-ui.tsx` | 28 | Data fetching | Yes — useQuery |
| 139 | `session-history-panel.tsx` | 33 | Legitimate lifecycle | No |
| 140 | `join-session-tab.tsx` | 46 | Data fetching | Yes — useQuery |
| 141 | `start-climbing-button.tsx` | 167 | Derived state | Yes — useMemo |
| 142 | `use-wake-lock.ts` | 21 | Legitimate lifecycle | No |
| 143 | `use-wake-lock.ts` | 63 | Sync external (WL) | No |
| 144 | `use-wake-lock.ts` | 77 | Event subscription | No |
| 145 | `use-board-bluetooth.ts` | 179 | Legitimate lifecycle | No |
| 146 | `bluetooth-context.tsx` | 47 | Sync external (BT) | No |
| 147 | `swipe-board-carousel.tsx` | 63 | Animation | No |
| 148 | `moonboard-edit-modal.tsx` | 117 | Legitimate lifecycle | No |

---

## Recommended Refactoring Patterns

### Pattern 1: Replace Derived State with `useMemo`

**When:** An effect reads state/props, computes a value, and calls `setState`.

```tsx
// Before (causes double render)
const [derived, setDerived] = useState(null);
useEffect(() => {
  setDerived(computeFrom(a, b));
}, [a, b]);

// After (computed synchronously during render)
const derived = useMemo(() => computeFrom(a, b), [a, b]);
```

### Pattern 2: Remove Ref-Syncing Effects

**When:** An effect only does `ref.current = value`.

```tsx
// Before
useEffect(() => { myRef.current = value; }, [value]);

// After — assign during render (safe for refs)
myRef.current = value;
```

### Pattern 3: Replace Cascading State with a Reducer

**When:** Multiple effects form a chain where one setState triggers the next effect.

```tsx
// Before — N effects, N+1 renders
useEffect(() => { setB(deriveB(a)); }, [a]);
useEffect(() => { setC(deriveC(b)); }, [b]);

// After — single dispatch, single render
const [state, dispatch] = useReducer(reducer, initialState);
// Or derive inline:
const b = useMemo(() => deriveB(state.a), [state.a]);
const c = useMemo(() => deriveC(b), [b]);
```

### Pattern 4: Replace Data Fetching with React Query

**When:** An effect fetches data and manages loading/error state manually.

```tsx
// Before
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  let cancelled = false;
  fetchData().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
  return () => { cancelled = true; };
}, [dep]);

// After
const { data, isLoading } = useQuery({
  queryKey: ['myData', dep],
  queryFn: () => fetchData(),
});
```

### Pattern 5: Reset Component State with `key`

**When:** An effect resets multiple state variables when a prop changes.

```tsx
// Before
useEffect(() => {
  setFormValue1(prop.value1);
  setFormValue2(prop.value2);
  setFormValue3(prop.value3);
}, [prop]);

// After — remount with key
<MyComponent key={prop.id} initialValues={prop} />
```

### Pattern 6: Use `useDebouncedValue` for Debounced State

**When:** An effect wraps a `setTimeout` to debounce a value.

```tsx
// Before
const [debounced, setDebounced] = useState(value);
useEffect(() => {
  const t = setTimeout(() => setDebounced(value), delay);
  return () => clearTimeout(t);
}, [value, delay]);

// After — use existing hook
const debounced = useDebouncedValue(value, delay);
```

---

## Suggested Implementation Order

1. **Quick wins (< 1 hour each):**
   - Remove 8 ref-syncing effects in `persistent-session-context.tsx` and `use-queue-session.ts`
   - Replace `create-climb-heatmap-overlay.tsx` effect with `useDebouncedValue`
   - Replace `board-config-live-preview.tsx` and `board-config-preview.tsx` effects with `useMemo`
   - Derive `hasDoneFirstFetch` inline in `use-queue-data-fetching.tsx`
   - Use `key` prop for `logascent-form.tsx` and `playlist-edit-drawer.tsx`

2. **Medium effort (2-4 hours each):**
   - Extract `useBoardConfigCascade` reducer for `consolidated-board-config.tsx` and `board-selector-drawer.tsx`
   - Migrate `profile-page-content.tsx` data fetching (4 effects) to `useQuery`
   - Migrate `library-page-content.tsx` data fetching to `useQuery`
   - Derive `selectedBoard` in playlist pages with `useMemo`

3. **Larger refactors (half day+ each):**
   - Systematically migrate remaining ~25 data-fetching effects to React Query
   - Move server-fetchable data to server components (profiles, admin checks, OAuth providers)
   - Extract `persistent-session-context.tsx` WebSocket effect into a dedicated `useGraphQLSession` hook
