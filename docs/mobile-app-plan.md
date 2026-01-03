# Boardsesh Mobile App Development Plan

## Executive Summary

This document outlines the implementation plan for building native Android and iOS apps using **React Native with Expo**. The plan prioritizes early validation of high-risk technical components and positions Party Mode (real-time collaboration) as a core differentiating feature.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Reusable Assets](#reusable-assets)
3. [Components Requiring Rebuild](#components-requiring-rebuild)
4. [Package Structure](#package-structure)
5. [Implementation Milestones](#implementation-milestones)
6. [Validation Strategy](#validation-strategy)
7. [Risk Assessment](#risk-assessment)
8. [Success Criteria](#success-criteria)

---

## Technology Stack

| Concern | Library | Rationale |
|---------|---------|-----------|
| Framework | Expo SDK 52+ | Simplified native module management, OTA updates |
| Navigation | Expo Router | File-based routing, deep linking built-in |
| UI Library | Tamagui | Performance-focused, great theming, cross-platform |
| Bluetooth | react-native-ble-plx | Mature, well-documented, handles iOS/Android differences |
| SVG Rendering | react-native-svg | Direct port path from web SVG components |
| Gestures | react-native-gesture-handler | Smooth drag-drop, pinch-zoom |
| Animations | react-native-reanimated | 60fps animations, worklet-based |
| State | React Context + useReducer | Same pattern as web, easy code sharing |
| GraphQL HTTP | graphql-request | Lightweight, TypeScript-first |
| GraphQL WS | graphql-ws | Same library as web, proven compatibility |
| Data Fetching | @tanstack/react-query | Caching, background sync, same as web |
| Offline Storage | expo-sqlite | Relational queries, better than AsyncStorage |
| Secure Storage | expo-secure-store | Keychain/Keystore for tokens |
| Forms | React Hook Form + Zod | Validation, same schemas as web |

---

## Reusable Assets

### Direct Reuse (No Changes)

| Package | What's Reusable |
|---------|-----------------|
| `packages/backend` | Entire package - GraphQL API, WebSocket subscriptions |
| `packages/shared-schema` | GraphQL schema, TypeScript types, operations |
| `packages/db` | Server-side only, unchanged |

### Reuse with Extraction

Create `packages/shared-logic` to share:

```
packages/shared-logic/
├── src/
│   ├── queue/
│   │   ├── reducer.ts       # Queue state reducer (from web)
│   │   ├── actions.ts       # Action creators
│   │   └── types.ts         # Queue types
│   ├── board/
│   │   ├── hold-states.ts   # HOLD_STATE_MAP constants
│   │   ├── colors.ts        # Color encoding utilities
│   │   └── config.ts        # Board configurations
│   ├── bluetooth/
│   │   └── protocol.ts      # Packet framing, encoding (platform-agnostic)
│   ├── climb/
│   │   ├── transformers.ts  # Climb data utilities
│   │   └── validators.ts    # Zod schemas
│   └── index.ts
└── package.json
```

### Adapt from Web

| Source | Adaptation Needed |
|--------|-------------------|
| `theme-config.ts` | Convert to Tamagui token format |
| `graphql/operations.ts` | Already portable, just import |
| URL slug encoding | Adapt for deep linking |

---

## Components Requiring Rebuild

### UI Layer (Complete Rewrite)

| Web (Ant Design) | Mobile (Tamagui) |
|------------------|------------------|
| `<Drawer>` search | `<Sheet>` bottom sheet |
| `<List>` queue | `<FlatList>` with drag handles |
| `<Card>` climb | Custom `<ClimbCard>` |
| `<Modal>` dialogs | `<Dialog>` or `<Sheet>` |
| `<Form>` inputs | Tamagui `<Input>`, `<Select>` |
| `<Tabs>` navigation | Expo Router tab layout |

### Platform Features

| Feature | Implementation |
|---------|----------------|
| Bluetooth | `react-native-ble-plx` with custom hooks |
| Local storage | `expo-sqlite` with Drizzle ORM |
| Deep linking | Expo Router linking config |
| Push notifications | `expo-notifications` |
| Haptics | `expo-haptics` on actions |
| Wake lock | `expo-keep-awake` during climbing |
| Background fetch | `expo-background-fetch` for sync |

---

## Package Structure

```
boardsesh/
├── packages/
│   ├── web/                    # Existing (unchanged)
│   ├── backend/                # Existing (unchanged)
│   ├── shared-schema/          # Existing (unchanged)
│   ├── db/                     # Existing (unchanged)
│   │
│   ├── shared-logic/           # NEW: Extracted business logic
│   │   ├── src/
│   │   │   ├── queue/
│   │   │   ├── board/
│   │   │   ├── bluetooth/
│   │   │   └── climb/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                 # NEW: React Native app
│       ├── app/                # Expo Router screens
│       │   ├── (tabs)/
│       │   │   ├── index.tsx           # Home/Board
│       │   │   ├── search.tsx          # Search climbs
│       │   │   ├── queue.tsx           # Queue management
│       │   │   └── profile.tsx         # User profile
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   ├── party/
│       │   │   ├── [sessionId].tsx     # Party session
│       │   │   └── create.tsx          # Create session
│       │   ├── climb/
│       │   │   └── [uuid].tsx          # Climb detail
│       │   └── _layout.tsx
│       │
│       ├── components/
│       │   ├── board/
│       │   │   ├── BoardRenderer.tsx   # SVG board display
│       │   │   ├── HoldOverlay.tsx     # Interactive holds
│       │   │   └── BoardControls.tsx   # Zoom, mirror
│       │   ├── bluetooth/
│       │   │   ├── ScanModal.tsx
│       │   │   ├── ConnectionStatus.tsx
│       │   │   └── SendButton.tsx
│       │   ├── party/
│       │   │   ├── UserList.tsx
│       │   │   ├── SessionControls.tsx
│       │   │   └── JoinSheet.tsx
│       │   ├── queue/
│       │   │   ├── QueueList.tsx
│       │   │   ├── QueueItem.tsx
│       │   │   └── CurrentClimb.tsx
│       │   ├── search/
│       │   │   ├── SearchSheet.tsx
│       │   │   ├── FilterControls.tsx
│       │   │   └── ResultsList.tsx
│       │   └── common/
│       │       ├── ClimbCard.tsx
│       │       ├── GradeDisplay.tsx
│       │       └── LoadingState.tsx
│       │
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   ├── BluetoothContext.tsx
│       │   ├── QueueContext.tsx
│       │   └── PartyContext.tsx
│       │
│       ├── hooks/
│       │   ├── useBluetooth.ts
│       │   ├── usePartySession.ts
│       │   ├── useClimbSearch.ts
│       │   └── useQueue.ts
│       │
│       ├── services/
│       │   ├── bluetooth/
│       │   │   ├── BleManager.ts
│       │   │   └── BoardProtocol.ts
│       │   ├── graphql/
│       │   │   ├── client.ts
│       │   │   └── wsClient.ts
│       │   └── storage/
│       │       ├── database.ts
│       │       └── secureStore.ts
│       │
│       ├── theme/
│       │   └── tamagui.config.ts
│       │
│       ├── app.json
│       ├── eas.json
│       ├── package.json
│       └── tsconfig.json
```

---

## Implementation Milestones

### Milestone 0: Technical Validation (2-3 weeks)

> **Goal:** Prove feasibility of high-risk components before committing to full build

**Validation Targets:**

| Component | Validation Criteria | Risk Level |
|-----------|---------------------|------------|
| Bluetooth | Connect to real board, send LED command | 🔴 High |
| WebSocket | Establish graphql-ws connection, receive subscription | 🟡 Medium |
| SVG Rendering | Render full board with 200+ holds, smooth zoom | 🟡 Medium |
| Monorepo | shared-logic imports work in Expo | 🟢 Low |

**Deliverables:**
- [ ] Minimal Expo app with dev build
- [ ] Connect to Kilter/Tension board via BLE
- [ ] Send one climb's LED data successfully
- [ ] WebSocket subscription receives queue updates
- [ ] Board SVG renders with pinch-zoom
- [ ] Shared-logic package imports work

**Exit Criteria:** All validation targets pass on both iOS and Android physical devices

---

### Milestone 1: Foundation + Real-time Core (3-4 weeks)

> **Goal:** Establish app foundation with WebSocket infrastructure as first-class citizen

**Tasks:**
- [ ] Initialize Expo project with TypeScript
- [ ] Configure monorepo integration (npm workspaces)
- [ ] Set up Tamagui with design tokens from web
- [ ] Create `shared-logic` package, extract queue reducer
- [ ] Implement authentication flow
  - [ ] Aurora login form
  - [ ] Secure token storage (expo-secure-store)
  - [ ] Auth context provider
- [ ] Build GraphQL infrastructure
  - [ ] HTTP client for queries/mutations
  - [ ] WebSocket client for subscriptions
  - [ ] Connection state management
  - [ ] Automatic reconnection with backoff
- [ ] Create tab navigation structure
- [ ] Build placeholder screens

**Validation Checkpoint:**
- [ ] User can log in with Aurora credentials
- [ ] WebSocket connects and stays connected
- [ ] Subscription receives test events
- [ ] App handles network loss gracefully

---

### Milestone 2: Party Mode - The Differentiator (3-4 weeks)

> **Goal:** Deliver real-time collaboration early as key feature validation

**Tasks:**
- [ ] Implement party session management
  - [ ] Create session with board configuration
  - [ ] Join via session ID or deep link
  - [ ] Leave session cleanup
- [ ] Build real-time queue sync
  - [ ] Port queue reducer to shared-logic
  - [ ] Subscribe to `queueUpdates`
  - [ ] Handle all delta event types
  - [ ] Optimistic updates with correlation tracking
- [ ] Create party UI components
  - [ ] User presence list with avatars
  - [ ] Leader indicator
  - [ ] Session controls (end, transfer leadership)
  - [ ] Connection status indicator
- [ ] Implement session events
  - [ ] Subscribe to `sessionUpdates`
  - [ ] User joined/left notifications
  - [ ] Leader change handling
- [ ] Deep linking for session invites
  - [ ] `boardsesh://party/join/{sessionId}`
  - [ ] Universal links for web fallback

**Validation Checkpoint:**
- [ ] Two devices can join same session
- [ ] Queue changes sync in <500ms
- [ ] User presence updates in real-time
- [ ] Session survives app backgrounding
- [ ] Deep link opens correct session

---

### Milestone 3: Board Visualization (3-4 weeks)

> **Goal:** Interactive board display with full touch support

**Tasks:**
- [ ] Port SVG board renderer
  - [ ] Convert web SVG to react-native-svg
  - [ ] Render board background image
  - [ ] Render hold overlays with state colors
- [ ] Implement touch interactions
  - [ ] Pinch-to-zoom with react-native-gesture-handler
  - [ ] Pan/scroll when zoomed
  - [ ] Hold tap detection
  - [ ] Double-tap to reset zoom
- [ ] Build climb display
  - [ ] Current climb visualization
  - [ ] Hold state colors (start, hand, foot, finish)
  - [ ] Mirroring support
- [ ] Create climb info components
  - [ ] Climb card (name, grade, setter, stats)
  - [ ] Climb detail modal
  - [ ] Grade display with accuracy

**Validation Checkpoint:**
- [ ] Board renders all holds correctly
- [ ] Zoom/pan is smooth (60fps)
- [ ] Hold colors match web exactly
- [ ] Mirrored climbs display correctly

---

### Milestone 4: Bluetooth Integration (3-4 weeks)

> **Goal:** Connect to hardware and control LEDs

**Tasks:**
- [ ] Set up react-native-ble-plx
  - [ ] Configure Expo dev build with native modules
  - [ ] Request permissions (iOS/Android differences)
  - [ ] Handle permission denied states
- [ ] Implement device discovery
  - [ ] Scan with Aurora service UUID filter
  - [ ] Display discovered devices
  - [ ] Remember last connected device
- [ ] Build connection management
  - [ ] Connect with timeout handling
  - [ ] Monitor connection state
  - [ ] Auto-reconnect on disconnect
  - [ ] Background connection maintenance
- [ ] Port Bluetooth protocol
  - [ ] Extract to shared-logic (platform-agnostic)
  - [ ] Packet framing (FIRST/MIDDLE/LAST)
  - [ ] Color encoding (RGB to 8-bit)
  - [ ] Position encoding
- [ ] Create Bluetooth UI
  - [ ] Scan modal with device list
  - [ ] Connection status in header
  - [ ] Send to board button
  - [ ] Clear board action
- [ ] Screen wake lock during session

**Validation Checkpoint:**
- [ ] Discovers Kilter and Tension boards
- [ ] Connects reliably on iOS and Android
- [ ] Sending climb lights correct holds
- [ ] Reconnects after Bluetooth toggle
- [ ] Works with screen locked (wake lock)

---

### Milestone 5: Search & Queue Management (3-4 weeks)

> **Goal:** Find climbs and manage local queue

**Tasks:**
- [ ] Build search interface
  - [ ] Bottom sheet with filters
  - [ ] Grade range slider
  - [ ] Quality/stars filter
  - [ ] Ascents minimum filter
  - [ ] Setter name autocomplete
  - [ ] Sort options
- [ ] Implement search API integration
  - [ ] Infinite scroll with React Query
  - [ ] Debounced search input
  - [ ] Result caching
- [ ] Create queue management
  - [ ] Queue list with drag-to-reorder
  - [ ] Add from search results
  - [ ] Remove with swipe
  - [ ] Set as current climb
  - [ ] Clear queue action
- [ ] Local persistence
  - [ ] Store queue in SQLite
  - [ ] Restore on app launch
  - [ ] Sync with party session

**Validation Checkpoint:**
- [ ] Search returns correct results
- [ ] Filters work as expected
- [ ] Drag reorder is smooth
- [ ] Queue persists across app restarts
- [ ] Queue syncs with party when connected

---

### Milestone 6: Logbook & Progress (2-3 weeks)

> **Goal:** Track climbing achievements

**Tasks:**
- [ ] Implement tick tracking
  - [ ] Log ascent from climb view
  - [ ] Log attempt
  - [ ] Sync with server
- [ ] Build logbook UI
  - [ ] History list by date
  - [ ] Filter by board/grade
  - [ ] Climb detail from history
- [ ] Add progress statistics
  - [ ] Grades climbed chart
  - [ ] Attempts vs sends ratio
  - [ ] Streak tracking

**Validation Checkpoint:**
- [ ] Ticks save and sync
- [ ] History displays correctly
- [ ] Stats calculate accurately

---

### Milestone 7: Polish & Launch (2-3 weeks)

> **Goal:** Production readiness and app store submission

**Tasks:**
- [ ] Performance optimization
  - [ ] Profile and fix slow renders
  - [ ] Optimize SVG rendering
  - [ ] Reduce bundle size
- [ ] Error handling
  - [ ] Sentry integration
  - [ ] User-friendly error messages
  - [ ] Crash recovery
- [ ] Offline improvements
  - [ ] Graceful degradation
  - [ ] Offline queue edits
  - [ ] Sync on reconnect
- [ ] App store preparation
  - [ ] App icons (all sizes)
  - [ ] Splash screen
  - [ ] Screenshots for store listings
  - [ ] App descriptions
  - [ ] Privacy policy
  - [ ] Terms of service
- [ ] Beta testing
  - [ ] TestFlight distribution
  - [ ] Play Store internal testing
  - [ ] Gather feedback
- [ ] App store submission

**Validation Checkpoint:**
- [ ] No crashes in beta testing
- [ ] Performance targets met
- [ ] App store review passed

---

## Validation Strategy

### Continuous Validation Practices

| Practice | Frequency | Purpose |
|----------|-----------|---------|
| Physical device testing | Daily | Catch platform-specific issues early |
| Bluetooth hardware tests | Weekly | Verify protocol compatibility |
| Party mode multi-device | Per milestone | Ensure real-time sync works |
| Performance profiling | Per milestone | Catch regressions |
| Beta user feedback | Milestones 5-7 | Real-world validation |

### Device Test Matrix

| Platform | Devices | Priority |
|----------|---------|----------|
| iOS | iPhone 12+, iPhone SE | High |
| Android | Pixel 6+, Samsung Galaxy S21+ | High |
| Android | Budget Android (Redmi, etc.) | Medium |

### Validation Gates

Each milestone has explicit validation checkpoints. **Do not proceed to next milestone until all checkpoints pass.**

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| BLE differences iOS vs Android | High | High | Milestone 0 validates both platforms |
| WebSocket reliability on mobile | Medium | High | Robust reconnection in Milestone 1 |
| SVG performance with many holds | Medium | Medium | Profile in Milestone 3, fallback to Skia |
| Background Bluetooth on iOS | Medium | Medium | Test extensively, document limitations |

### Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Milestone 0 fails validation | Low | Critical | Early validation prevents wasted effort |
| BLE debugging takes longer | High | Medium | Buffer time built into Milestone 4 |
| App store rejection | Medium | Low | Follow guidelines, submit early |

---

## Success Criteria

### MVP Definition

The MVP includes Milestones 0-5:
- ✅ Bluetooth board connection
- ✅ Real-time party mode
- ✅ Board visualization
- ✅ Climb search
- ✅ Queue management

Logbook (Milestone 6) and polish (Milestone 7) complete the v1.0 release.

### Performance Targets

| Metric | Target |
|--------|--------|
| App cold start | < 2 seconds |
| Board render | < 500ms |
| BLE connection | < 5 seconds |
| Search response | < 1 second |
| Queue sync latency | < 500ms |
| Frame rate | 60fps during interactions |

### Platform Requirements

| Platform | Minimum Version |
|----------|-----------------|
| iOS | 15.0+ |
| Android | API 29 (Android 10)+ |

---

## Appendix

### Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react-native": "0.76.x",
    "react": "18.3.x",

    "tamagui": "^1.100.0",
    "@tamagui/config": "^1.100.0",

    "react-native-ble-plx": "^3.2.0",
    "react-native-svg": "^15.0.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-reanimated": "~3.16.0",

    "graphql": "^16.8.0",
    "graphql-request": "^7.0.0",
    "graphql-ws": "^6.0.0",

    "expo-secure-store": "~14.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-keep-awake": "~14.0.0",
    "expo-haptics": "~14.0.0",
    "expo-notifications": "~0.29.0",

    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0"
  }
}
```

### Platform Permissions

**iOS (Info.plist):**
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Connect to your climbing board to control LED holds</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Connect to your climbing board</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>
```

**Android (AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Deep Linking Configuration

```json
{
  "expo": {
    "scheme": "boardsesh",
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://boardsesh.com"
        }
      ]
    ]
  }
}
```

Supported deep links:
- `boardsesh://party/join/{sessionId}` - Join party session
- `boardsesh://climb/{uuid}` - Open climb detail
- `boardsesh://board/{boardName}/{layoutId}/{sizeId}/{setIds}/{angle}` - Open board config

---

*Document version: 2.0*
*Last updated: January 2026*
