# Spotify-Inspired UI Redesign Plan

## Overview

This plan transforms Boardsesh's UI into a Spotify-like experience with a persistent bottom navigation bar, a "now playing" bar that expands into a full-screen view, compact list items with swipe gestures, and drawer-based flows for party mode, creation, and search. The goal is a cohesive, polished mobile-first experience that feels fluid and modern.

---

## Current Architecture Reference

| Component | File | Role |
|---|---|---|
| Main Layout | `packages/web/app/[board_name]/.../[angle]/layout.tsx` | Header + Content + Affixed QueueControlBar |
| List Layout | `.../[angle]/list/layout-client.tsx` | Main content + desktop sidebar (Queue/Search/Holds tabs) |
| Header | `packages/web/app/components/board-page/header.tsx` | Logo, search, angle, create, party, LED, user menu |
| QueueControlBar | `packages/web/app/components/queue-control/queue-control-bar.tsx` | Now-playing bar with swipe, queue drawer, play button, tick |
| ClimbCard | `packages/web/app/components/climb-card/climb-card.tsx` | Full card view with cover image, title, action footer |
| ClimbTitle | `packages/web/app/components/climb-card/climb-title.tsx` | Name, grade (colorized), quality, setter info |
| QueueListItem | `packages/web/app/components/queue-control/queue-list-item.tsx` | Compact row with thumbnail, swipe to tick/delete |
| PlayView | `.../play/[climb_uuid]/play-view-client.tsx` | Full board renderer with swipe navigation |
| ShareBoardButton | `packages/web/app/components/board-page/share-button.tsx` | Party mode drawer (top placement) |
| SendClimbToBoardButton | `packages/web/app/components/board-bluetooth-control/send-climb-to-board-button.tsx` | Bluetooth LED connection |
| SearchButton/Drawer | `packages/web/app/components/search-drawer/` | Right-side drawer with filters |
| ClimbActions | `packages/web/app/components/climb-actions/` | Favorite, queue, tick, share, playlist, open-in-app, mirror |
| BoardRenderer | `packages/web/app/components/board-renderer/board-renderer.tsx` | SVG board visualization |

---

## Design Principles

1. **Bottom-up navigation** - All primary navigation lives at the bottom of the screen within thumb reach
2. **Progressive disclosure** - Simple surface, rich detail on demand (drawers, menus)
3. **Gestural interaction** - Swipe actions for common operations (heart, queue, tick, delete)
4. **Smooth transitions** - Full-screen drawer transitions for play view, not page navigations
5. **Consistent density** - Two list modes (compact/expanded) instead of full cards vs queue items
6. **Minimal chrome** - Reduce header clutter, move actions closer to content

---

## Wireframes (ASCII)

### Mobile Layout - List View (Compact Mode)
```
┌────────────────────────────────────┐
│ [Logo]  [Search Input]  [≡ Menu]   │  ← Simplified header
├────────────────────────────────────┤
│                                    │
│ ┌──────────────────────────────┐   │
│ │ [Thumb] V4  "Problem Name"  ⋮│   │  ← Compact climb row
│ │         ★★★  By setter     ⋮│   │    Swipe L=♡, R=+Queue
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ [Thumb] V7  "Another Climb" ⋮│   │
│ │         ★★☆  By setter2    ⋮│   │
│ └──────────────────────────────┘   │
│ ...                                │
│                                    │
├────────────────────────────────────┤
│ [Thumb] "Current Climb"  [Q] [✓]  │  ← Now Playing bar (tap=expand)
├────────────────────────────────────┤
│   🧗 Climbs    🔍 Search   ✚ New  │  ← Bottom tab bar
└────────────────────────────────────┘
```

### Mobile Layout - List View (Expanded/Card Mode)
```
┌────────────────────────────────────┐
│ [Logo]  [Search Input]  [≡ Menu]   │
├────────────────────────────────────┤
│                                    │
│ ┌──────────────────────────────┐   │
│ │  "Problem Name"    V4       │   │  ← Standard climb card
│ │  ★★★  By setter             │   │    (existing ClimbCard)
│ │ ┌──────────────────────────┐ │   │
│ │ │                          │ │   │
│ │ │    [Board Renderer]      │ │   │
│ │ │                          │ │   │
│ │ └──────────────────────────┘ │   │
│ │  ♡  +Queue  🔗Share  ...    │   │
│ └──────────────────────────────┘   │
│                                    │
├────────────────────────────────────┤
│ [Thumb] "Current Climb"  [Q] [✓]  │
├────────────────────────────────────┤
│   🧗 Climbs    🔍 Search   ✚ New  │
└────────────────────────────────────┘
```

### Now Playing Expanded (Full-screen Drawer)
```
┌────────────────────────────────────┐
│  ⌄ (drag handle)                   │  ← Drag down to dismiss
├────────────────────────────────────┤
│                                    │
│  "Problem Name"           V4      │  ← ClimbTitle horizontal
│  ★★★  By setter  @ 40°            │
│                                    │
│ ┌──────────────────────────────┐   │
│ │                              │   │
│ │                              │   │
│ │      [Board Renderer]        │   │
│ │       (fills height)         │   │
│ │                              │   │
│ │                              │   │
│ └──────────────────────────────┘   │
│                                    │
│   ← swipe indicators →            │
│                                    │
├────────────────────────────────────┤
│ [Mirror] [♡] [Party] [LED] [✓]    │  ← Action bar
├────────────────────────────────────┤
│  ◀ Prev │ ▮▮ Current │ Next ▶     │  ← Mini transport controls
└────────────────────────────────────┘
```

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  [Search Input]  [Angle ▾]  [Create]  [≡ User Menu] │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│  Climb list (2-col grid)         │  Sidebar (400px)         │
│  - Toggle: Compact / Card        │  Tabs: Queue | Search    │
│                                  │                          │
│  [Card] [Card]                   │  [Queue items...]        │
│  [Card] [Card]                   │                          │
│  ...                             │                          │
│                                  │                          │
├──────────────────────────────────┴──────────────────────────┤
│ [Thumb] "Current Climb" V4   [🔄Mirror] [Q] [Party] [✓]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Bottom Tab Bar

### What changes
Add a persistent bottom tab bar below the QueueControlBar with three tabs: **Climbs**, **Search**, and **Create**.

### Files to modify

1. **New file: `packages/web/app/components/bottom-tab-bar/bottom-tab-bar.tsx`**
   - Three tabs: Climbs (default active), Search, Create
   - Icons: Use AntD icons - `UnorderedListOutlined` / `AppstoreOutlined` for Climbs, `SearchOutlined` for Search, `PlusOutlined` for Create
   - Active state: Primary color for active tab icon + label
   - Inactive state: `neutral[400]` color
   - Fixed at the bottom, full width
   - Height: ~50px with safe-area-inset-bottom padding for iOS
   - Desktop: Hidden (search/queue available in sidebar, create in header)

2. **New file: `packages/web/app/components/bottom-tab-bar/bottom-tab-bar.module.css`**
   - Media query to hide on desktop (>= 768px)
   - Safe area inset for iOS home indicator

3. **Modify: `packages/web/app/[board_name]/.../[angle]/layout.tsx`**
   - Add BottomTabBar below the Affix'd QueueControlBar
   - Wrap both in a shared bottom container
   - Adjust Content height to account for tab bar height

4. **Modify: `packages/web/app/components/search-drawer/search-drawer.tsx`**
   - Search tab triggers the existing search drawer (right placement, 90% width)
   - No structural change needed - just wire the tab to open it

5. **New file: `packages/web/app/components/create-drawer/create-drawer.tsx`**
   - Bottom drawer with creation options
   - Two items initially:
     - "Create Climb" - links to `/create` route
     - "Create Playlist" - links to `/playlists` with create action
   - Each item: Icon + label, full-width rows
   - Simple AntD Drawer with bottom placement, auto height

### Behavior
- **Climbs tab**: Navigates to the climb list view (if not already there). This is the default/home state.
- **Search tab**: Opens the existing SearchDrawer from the bottom tab rather than from the header. On desktop, activates the sidebar search tab instead.
- **Create tab**: Opens the CreateDrawer with options.
- Active tab state reflects current context (Climbs when on list, etc.)
- On desktop (>= 768px): Tab bar is hidden. Search and create remain in header/sidebar.

### Integration with header
- Remove the mobile SearchButton from the header center section (it moves to bottom tab bar)
- Keep the desktop SearchButton in the sidebar
- Remove "Create Climb" from the mobile meatball menu (it moves to bottom tab bar)

---

## Phase 2: Compact Climb List Mode

### What changes
Add a "compact" display mode for the climb list that renders climbs as slim rows (similar to QueueListItem) instead of full cards.

### Files to modify/create

1. **New file: `packages/web/app/components/climb-card/climb-list-item.tsx`**
   - Compact list item component, similar structure to QueueListItem
   - Layout:
     ```
     ┌─────────────────────────────────────────────────────┐
     │ [Thumbnail]  Name + Setter     [V-Grade]    [⋮]    │
     │   48×auto    ★★★               (colorized)  (menu) │
     └─────────────────────────────────────────────────────┘
     ```
   - Left side: `ClimbThumbnail` (48px width, maintains aspect ratio)
   - Center: Climb name (single line, ellipsis overflow), quality stars, setter name (secondary text, small)
   - Right side: Large colorized V-grade text (use `getVGradeColor()`), ellipsis button
   - Total height: ~60-64px per item
   - No horizontal padding waste - edge-to-edge content
   - The V-grade should be visually prominent with the grade color as the text color, similar to how ClimbTitle renders it in horizontal mode but larger/bolder

2. **Add swipe actions to `climb-list-item.tsx`**
   - Reuse the swipe pattern from `queue-list-item.tsx` (same SWIPE_THRESHOLD=100, MAX_SWIPE=120)
   - **Swipe right (reveals left)**: Heart/favorite action
     - Background: `colors.error` (red, matching heart color) or a warm pink
     - Icon: `HeartOutlined` / `HeartFilled`
     - Action: Toggle favorite on the climb via existing favorite API
   - **Swipe left (reveals right)**: Add to queue action
     - Background: `colors.primary` (cyan)
     - Icon: `PlusOutlined` or `OrderedListOutlined`
     - Action: Add climb to queue via `addToQueue()` from QueueContext

3. **Ellipsis menu drawer: `packages/web/app/components/climb-card/climb-actions-drawer.tsx`**
   - Bottom drawer triggered by the `⋮` (EllipsisOutlined) button
   - Header: ClimbTitle (stacked layout) with thumbnail
   - Body: Full list of actions as large tap targets (rows, not icons):
     - ♡ Favorite / Unfavorite
     - + Add to Queue
     - ✓ Log Ascent
     - 🔗 Share
     - 📋 Add to Playlist
     - 📱 Open in Aurora App
     - 🔄 Mirror (if board supports mirroring)
     - ℹ️ View Details (navigate to /view/ page)
   - Each row: Icon (24px) + Label text, full width, ~48px height
   - Reuse action handlers from existing `ClimbActions` component

4. **Modify: `packages/web/app/components/board-page/climbs-list.tsx`**
   - Add a view mode toggle: "Grid" (current cards) vs "List" (compact)
   - Store preference in localStorage (key: `climbListViewMode`)
   - Toggle button in a sticky header area above the list
   - Icons: `AppstoreOutlined` for grid, `UnorderedListOutlined` for list
   - When in list mode: Render `ClimbListItem` instead of `ClimbCard`
   - When in list mode: Single column layout (no grid), full width items
   - When in grid mode: Keep existing 2-column card grid
   - Default to compact/list mode on mobile, grid mode on desktop

5. **Modify: `packages/web/app/components/climb-card/climb-thumbnail.tsx`**
   - No changes needed - already supports the 48px fixed-width pattern

### Performance considerations
- ClimbListItem should be `React.memo`'d with custom comparator (compare by climb.uuid)
- Swipe state is local to each item (no parent re-renders)
- Virtual scrolling is not needed yet (existing infinite scroll pagination handles this)

---

## Phase 3: Now Playing Bar Redesign + Full-screen Play Drawer

### What changes
- Redesign QueueControlBar to be simpler with only essential controls
- Tapping the bar opens a full-screen drawer (the "play view") instead of navigating to `/play/[uuid]`
- Remove the `ExpandOutlined` (play mode) button; the bar itself is the entry point
- Add a queue list button and keep the tick button
- Move party mode button to the bar

### 3A: QueueControlBar Redesign

**Modify: `packages/web/app/components/queue-control/queue-control-bar.tsx`**

Current button cluster: `[Mirror] [Play] [Prev] [Next] [Tick]`

New button cluster: `[Party] [Queue] [Tick]`

Changes:
- **Remove**: `ExpandOutlined` play mode link button
- **Remove**: Mirror button (moves to full-screen play view action bar)
- **Remove**: Previous/Next navigation buttons (the bar's swipe gestures and the play view handle this)
- **Add**: Party mode button (the `ShareBoardButton` component, moved from header)
- **Add**: Queue list button (`UnorderedListOutlined`) that opens the queue drawer (replaces tapping the climb info text)
- **Keep**: Tick button stays

New layout:
```
┌──────────────────────────────────────────────────────────┐
│ [Thumbnail] "Climb Name" V4  ★★★  │  [👥Party] [≡Q] [✓] │
│              @ 40°                 │                      │
└──────────────────────────────────────────────────────────┘
```

Tap behavior:
- Tapping the **left section** (thumbnail + climb info) opens the full-screen play drawer
- Tapping **Queue button** opens the existing queue drawer
- Tapping **Party button** opens the party mode drawer (see Phase 5)
- Tapping **Tick button** logs ascent (existing behavior)
- Swipe left/right: Navigate to next/previous climb (existing behavior, keep as-is)

The click handler on the climb info section (currently `toggleQueueDrawer`) should change to open the full-screen play drawer instead.

### 3B: Full-Screen Play Drawer

**New file: `packages/web/app/components/play-view/play-view-drawer.tsx`**

A drawer component that replaces the `/play/` route for mobile interaction:

- **Placement**: Bottom
- **Height**: 100% viewport (or 95% with rounded top corners)
- **Animation**: Smooth slide-up from the now-playing bar, like Spotify's now-playing expansion
- **Drag to close**: Support dragging down from the top handle to dismiss

Content (reuse existing PlayView logic):
```
┌──────────────────────────────────────┐
│  ── (drag handle bar) ──            │
│                                      │
│  "Problem Name"             V4      │  ClimbTitle (horizontal)
│  ★★★  By setter  @ 40°              │  with AscentStatus
│                                      │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │       [Board Renderer]           │ │  BoardRenderer fillHeight
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│    ← swipe left/right indicators →   │  Swipe navigation
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [🔄] [♡] [👥] [💡LED] [✓Tick]  │ │  Action bar
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [◀ Prev]  Current Name  [Next ▶]│ │  Mini transport
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Action bar buttons:
- **Mirror** (`SyncOutlined`): Toggle mirrored state (purple when active)
- **Favorite** (`HeartOutlined`/`HeartFilled`): Toggle favorite
- **Party** (`TeamOutlined`): Open party drawer
- **LED** (`BulbOutlined`/`BulbFilled`): Connect/send to board (only if Bluetooth supported)
- **Tick** (`CheckOutlined`): Log ascent

Mini transport controls:
- Shows previous/current/next climb names
- Tap previous/next to navigate
- Current climb name centered, truncated with ellipsis

Key implementation details:
- Extract the swipe navigation logic from `play-view-client.tsx` into a shared hook: `usePlayViewNavigation()`
- The drawer should manage its own URL state - when opened, optionally push a `#playing` hash to enable back-button closing
- When the drawer is open and the user navigates (swipe/buttons), update the queue's currentClimbQueueItem without URL navigation
- The existing `/play/[uuid]` route should remain functional for direct links and desktop, but mobile primarily uses the drawer

**New file: `packages/web/app/components/play-view/use-play-view-navigation.ts`**
- Shared hook extracting swipe logic from play-view-client.tsx
- Handles: handleNext, handlePrevious, swipeHandlers, swipeOffset, showSwipeHint
- Used by both PlayViewDrawer and PlayViewClient

### 3C: Impact on existing Play route

**Modify: `.../play/[climb_uuid]/play-view-client.tsx`**
- Keep the full page play view for desktop users and direct URL access
- Extract navigation logic to the shared hook
- On mobile, consider auto-redirecting to list view with the drawer open (or just keep both paths working)

**Modify: `.../play/layout-client.tsx`**
- No changes needed for desktop sidebar behavior

---

## Phase 4: Header Simplification

### What changes
Reduce header clutter by moving elements to the bottom tab bar and queue control bar.

### Files to modify

**Modify: `packages/web/app/components/board-page/header.tsx`**

Removals:
- **Remove**: `ShareBoardButton` (party mode) - moves to QueueControlBar
- **Remove**: `SendClimbToBoardButton` (LED) - moves to play view drawer action bar
- **Remove**: Mobile `SearchButton` - moves to bottom tab bar
- **Remove**: "Create Climb" from mobile meatball menu - moves to bottom tab bar

The header becomes:
```
Mobile:  [Logo]  [Search Input]  [Angle ▾]  [≡ Menu]
Desktop: [Logo]  [Search Input]  [Angle ▾]  [+ Create]  [👥 Party]  [💡 LED]  [User ▾]
```

On mobile the header is now much simpler - just branding, search text input, angle selector, and the user menu.

On play/view pages (mobile), the header shows:
```
[← Back]  [Logo]  [Angle ▾]  [≡ Menu]
```

**Modify: mobile meatball menu items**
- Remove "Create Climb" (now in bottom tab bar's Create drawer)
- Keep: My Playlists, Classify Holds, Profile, Settings, Help, About, Logout

### Header height
- Keep at `8dvh` / min 48px
- The reduced content means it could potentially be slimmer, but keep it consistent for now

---

## Phase 5: Party Mode & LED as Drawer

### What changes
Convert party mode into a bottom drawer (instead of top drawer) and integrate LED connection into it.

### Files to modify

**Modify: `packages/web/app/components/board-page/share-button.tsx`**
- Change drawer placement from `"top"` to `"bottom"`
- Rename component to `PartyModeButton` (optional, for clarity)
- Add a "Connect to Board" section at the bottom of the drawer when a session is active or as a standalone tab
- The drawer should have two sections/tabs:
  1. **Party Mode** - existing start/join/active session UI
  2. **Connect to Board (LED)** - Bluetooth connection UI

**New section within the party drawer: LED Connection**
- "Connect to Board" button (replaces the header LED button on mobile)
- Connection status indicator (connected/disconnected)
- When connected: "Connected to [device name]" with disconnect option
- This reuses the logic from `SendClimbToBoardButton` but presents it differently
- On mobile, this is the only way to access LED. On desktop, the header button remains as a quick shortcut.

**Modify: `packages/web/app/components/board-bluetooth-control/send-climb-to-board-button.tsx`**
- Extract connection logic into a shared hook: `useBluetoothConnection()`
- The button component becomes a thin wrapper around the hook
- The party drawer's LED section also uses the same hook

**New file: `packages/web/app/components/board-bluetooth-control/use-bluetooth-connection.ts`**
- Extracts: device ref, characteristic ref, connect/disconnect, send climb, connection state
- Returns: `{ isConnected, isLoading, connect, disconnect, sendClimb }`

### Party mode trigger locations
- **QueueControlBar**: Party mode button (badge shows connected user count)
- **Play view drawer action bar**: Party mode button
- **Desktop header**: Keeps existing position (ShareBoardButton)

---

## Phase 6: Queue List Improvements

### What changes
Minor refinements to the queue list to match the new design language.

### Files to modify

**Modify: `packages/web/app/components/queue-control/queue-list-item.tsx`**
- Ensure visual consistency with the new `ClimbListItem` compact format
- Same height, typography, grade coloring
- Keep existing swipe actions (tick left, delete right)
- Keep drag-and-drop reordering

**Modify: queue drawer behavior**
- Queue drawer now opens from the dedicated Queue button on the bar (not from tapping climb info)
- Placement stays bottom, height stays 70%
- Add a count badge on the Queue button showing queue length

---

## Phase 7: Desktop Adaptation

### What changes
Ensure the desktop experience remains cohesive while the mobile experience is transformed.

### Desktop-specific behavior

1. **No bottom tab bar** - Hidden via CSS media query (>= 768px)
2. **Sidebar stays** - Queue/Search/Holds tabs in the sidebar (existing)
3. **Header keeps** - Party, LED, Create, User menu buttons in header
4. **Play view** - Desktop users still use the full `/play/` page route
5. **Climb list** - Default to grid (card) mode on desktop, compact (list) mode on mobile
6. **QueueControlBar** - Shows additional prev/next buttons on desktop (restore the `navButtons` span behavior)

### Files to modify
- **`packages/web/app/components/bottom-tab-bar/bottom-tab-bar.module.css`**: `display: none` for >= 768px
- **`packages/web/app/components/queue-control/queue-control-bar.tsx`**: Conditional rendering of play link on desktop (since desktop doesn't use the drawer)
- **`packages/web/app/components/board-page/header.tsx`**: Desktop keeps party + LED buttons via `.desktopOnly` class

---

## Implementation Order

The phases are designed to be implemented sequentially, each building on the previous:

```
Phase 1: Bottom Tab Bar
  └─ Foundation for new navigation structure
  └─ Create drawer for "New" tab

Phase 2: Compact Climb List Mode
  └─ ClimbListItem component
  └─ Swipe actions (heart/queue)
  └─ Ellipsis menu drawer
  └─ View mode toggle

Phase 3: Now Playing Bar + Play Drawer
  └─ 3A: QueueControlBar button redesign
  └─ 3B: Full-screen play drawer
  └─ 3C: Shared navigation hook

Phase 4: Header Simplification
  └─ Remove relocated elements
  └─ Verify desktop still complete

Phase 5: Party Mode & LED Drawer
  └─ Bottom drawer conversion
  └─ LED integration
  └─ Bluetooth hook extraction

Phase 6: Queue List Polish
  └─ Visual alignment with compact list

Phase 7: Desktop Adaptation
  └─ Responsive breakpoint verification
  └─ Desktop-specific overrides
```

---

## Component Dependency Graph

```
layout.tsx
├── BoardSeshHeader (simplified)
│   ├── Logo
│   ├── SearchClimbNameInput (mobile)
│   ├── AngleSelector
│   └── UserMenu
│
├── Content
│   ├── ClimbsList
│   │   ├── ClimbCard (grid mode)
│   │   └── ClimbListItem (compact mode) [NEW]
│   │       ├── ClimbThumbnail
│   │       ├── Colorized V-Grade
│   │       ├── Swipe: Heart / Add to Queue
│   │       └── ClimbActionsDrawer [NEW]
│   │
│   └── ListLayoutClient (desktop sidebar)
│       └── Tabs: Queue | Search
│
├── QueueControlBar (redesigned)
│   ├── ClimbThumbnail + ClimbTitle (tap → PlayViewDrawer)
│   ├── PartyModeButton (moved from header)
│   ├── QueueButton [NEW] (opens queue drawer)
│   ├── TickButton
│   ├── Queue Drawer (existing)
│   └── PlayViewDrawer [NEW]
│       ├── ClimbTitle
│       ├── BoardRenderer
│       ├── Swipe Navigation (shared hook)
│       ├── Action Bar [Mirror, Heart, Party, LED, Tick]
│       └── Mini Transport [Prev | Current | Next]
│
└── BottomTabBar [NEW]
    ├── Climbs Tab → Navigate to /list
    ├── Search Tab → Open SearchDrawer
    └── Create Tab → Open CreateDrawer [NEW]
        ├── Create Climb → /create route
        └── Create Playlist → /playlists route
```

---

## Shared Hooks to Extract

| Hook | Source | Used By |
|---|---|---|
| `usePlayViewNavigation` | `play-view-client.tsx` | PlayViewDrawer, PlayViewClient |
| `useBluetoothConnection` | `send-climb-to-board-button.tsx` | SendClimbToBoardButton, PartyDrawer LED section |

---

## CSS / Styling Approach

- All new components use **themeTokens** for colors, spacing, radii
- CSS modules for layout-only styles (flex, grid, responsive breakpoints)
- Inline styles for dynamic values (colors from theme, computed values)
- Media queries at 768px breakpoint for mobile/desktop splits
- Use `env(safe-area-inset-bottom)` for iOS safe area on bottom bar
- AntD Drawer component for all drawer UIs (consistent animations)
- Swipe gesture patterns reuse the existing `react-swipeable` + offset/threshold pattern

---

## Transition Animations

| Transition | Type | Duration |
|---|---|---|
| Play drawer open/close | Drawer slide-up | 300ms (AntD default) |
| Bottom tab active state | Color transition | 150ms ease |
| Swipe action reveal | Transform + opacity | Immediate (follows finger) |
| Swipe snap back | Transform | 150ms ease (existing) |
| List mode toggle | Fade / layout shift | 200ms ease |
| Create drawer open | Drawer slide-up | 300ms |

---

## Accessibility Considerations

- Bottom tab bar items have `aria-label` and `role="tab"`
- Play drawer has `aria-label="Now playing"` and manages focus on open
- Swipe actions have non-swipe alternatives (ellipsis menu for list items, buttons in play view)
- Color-coded grades maintain sufficient contrast ratios
- All interactive elements maintain minimum 44x44px touch targets

---

## State Management Impact

- **No new contexts needed** - all new components consume existing QueueContext
- **View mode preference**: localStorage (`climbListViewMode: 'compact' | 'grid'`)
- **Play drawer open state**: Local state in QueueControlBar (lifted up if needed)
- **Bottom tab active state**: Derived from current URL pathname
- **Bluetooth connection state**: Extracted to shared hook, existing context patterns

---

## Risk Areas & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Play drawer performance | Board renderer in drawer might be slow | Lazy-render drawer content; only mount BoardRenderer when drawer is open |
| Swipe conflict with scroll | Horizontal swipes on list items could interfere with vertical scroll | Existing pattern handles this (preventScrollOnSwipe + delta threshold) |
| Desktop regression | Moving buttons around might break desktop flow | Phase 7 explicitly verifies desktop; use `.desktopOnly`/`.mobileOnly` classes |
| Deep link to /play/ | Existing play URLs must still work | Keep the route, just make mobile default to drawer from list |
| Party mode button discovery | Moving from header to bar might confuse users | Badge with user count draws attention; tooltip on first use |
| Double drawer stacking | Play drawer open + queue drawer open | Close play drawer before opening queue, or stack with z-index |

---

## Testing Checklist

### Phase 1
- [ ] Bottom tab bar renders on mobile, hidden on desktop
- [ ] Climbs tab navigates to list
- [ ] Search tab opens search drawer
- [ ] Create tab opens create drawer
- [ ] Create drawer links work (create climb, create playlist)
- [ ] iOS safe area padding works

### Phase 2
- [ ] Compact list items render correctly
- [ ] Grade colors match existing ClimbTitle colors
- [ ] Swipe right favorites a climb (visual feedback)
- [ ] Swipe left adds to queue (visual feedback + queue updates)
- [ ] Ellipsis menu opens drawer with all actions
- [ ] All actions in drawer work (favorite, queue, tick, share, playlist, open-in-app, mirror, view)
- [ ] View mode toggle persists across page loads
- [ ] Infinite scroll works in both modes
- [ ] Scroll position restoration works in both modes

### Phase 3
- [ ] Tapping now-playing bar opens full-screen drawer
- [ ] Play drawer shows board renderer correctly
- [ ] Swipe navigation works in play drawer
- [ ] Mirror/favorite/tick actions work in play drawer
- [ ] Drag-to-close works smoothly
- [ ] Queue button opens queue drawer
- [ ] Party button opens party drawer
- [ ] Desktop still navigates to /play/ route
- [ ] /play/ URLs still work for direct links

### Phase 4
- [ ] Header is simplified on mobile
- [ ] All removed items are available elsewhere
- [ ] Desktop header still has all buttons
- [ ] No broken references to moved components

### Phase 5
- [ ] Party drawer opens from bottom
- [ ] LED connection section works within party drawer
- [ ] Bluetooth hook works in both contexts
- [ ] Start/join/leave session flows work
- [ ] LED auto-sends on climb change (existing behavior preserved)

### Phase 6
- [ ] Queue list items visually match compact climb list items
- [ ] Drag-and-drop still works
- [ ] Queue badge shows correct count

### Phase 7
- [ ] Desktop sidebar works unchanged
- [ ] Desktop header has all expected buttons
- [ ] Desktop play page works as before
- [ ] Responsive breakpoints are clean (no flickering between mobile/desktop)
