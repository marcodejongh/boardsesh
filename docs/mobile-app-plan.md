# Boardsesh Mobile App Development Plan

## Executive Summary

This document outlines a strategy for building native Android and iOS apps for Boardsesh that provide feature parity with the existing Next.js web application. The recommended approach is **React Native with Expo** due to code sharing potential, strong Bluetooth support, and the team's existing React expertise.

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Framework Comparison](#framework-comparison)
3. [Recommended Approach](#recommended-approach)
4. [Reusable Assets](#reusable-assets)
5. [Components Requiring Rebuild](#components-requiring-rebuild)
6. [Feature Implementation Plan](#feature-implementation-plan)
7. [Technical Architecture](#technical-architecture)
8. [Package Structure](#package-structure)
9. [Implementation Phases](#implementation-phases)
10. [Risk Assessment](#risk-assessment)

---

## Current Architecture Analysis

### What We Have

| Layer | Technology | Mobile Compatibility |
|-------|-----------|---------------------|
| Frontend | Next.js 15 + React 19 | ❌ Requires rewrite |
| UI Library | Ant Design | ❌ Web-only |
| State Management | Context + useReducer | ✅ Portable |
| Real-time | GraphQL-ws WebSocket | ✅ Works in RN |
| Backend | GraphQL Yoga + Redis | ✅ No changes needed |
| Database | PostgreSQL + Drizzle | ✅ Server-side only |
| Shared Types | TypeScript types | ✅ Fully reusable |
| Board Rendering | SVG | ⚠️ Needs react-native-svg |
| Bluetooth | Web Bluetooth API | ❌ Needs react-native-ble-plx |
| Offline Storage | IndexedDB | ❌ Needs AsyncStorage/SQLite |

### Key Features to Replicate

1. **Board Visualization** - SVG-based interactive climbing board display
2. **Bluetooth Control** - Connect to board hardware, control LEDs
3. **Queue Management** - Add/remove/reorder climbs, set current climb
4. **Party Mode** - Real-time multi-user session collaboration
5. **Search & Discovery** - Find climbs with filters (grade, quality, setter)
6. **Authentication** - Aurora Climbing login, user sessions
7. **Logbook** - Track ascents, attempts, personal progress
8. **Favorites & Playlists** - Save and organize climbs

---

## Framework Comparison

### Option 1: React Native + Expo (Recommended)

**Pros:**
- React expertise transfers directly
- Expo simplifies Bluetooth, push notifications, app store deployment
- Large ecosystem, active community
- react-native-ble-plx is mature for Bluetooth
- react-native-svg works well for board rendering
- Code sharing possible with web via React Native Web

**Cons:**
- Need to rewrite all UI components
- Some Expo limitations (mitigated by dev builds)
- Performance tuning may be needed for complex SVG rendering

### Option 2: Capacitor (Wrap Existing Web App)

**Pros:**
- Minimal code changes to existing web app
- Fastest initial development
- Single codebase for all platforms

**Cons:**
- Web Bluetooth still doesn't work in Capacitor WebView
- Would need native Bluetooth plugin anyway
- Performance concerns with complex SVG/animations
- "WebView app" feel, not truly native

### Option 3: Flutter

**Pros:**
- Excellent performance
- Single codebase for iOS/Android
- Strong Bluetooth libraries

**Cons:**
- Dart language - no code reuse with existing TypeScript
- Team would need to learn new framework
- Duplicate business logic

### Option 4: Native (Swift/Kotlin)

**Pros:**
- Best possible performance
- Full platform capabilities

**Cons:**
- Two separate codebases
- Significantly more development effort
- No code sharing with web

### Recommendation: React Native + Expo

React Native with Expo provides the best balance of:
- Developer experience (React/TypeScript skills transfer)
- Code sharing (shared-schema, business logic, types)
- Native capabilities (Bluetooth, offline storage)
- Ecosystem maturity (well-tested libraries for all our needs)

---

## Recommended Approach

### High-Level Strategy

1. **Create a new `packages/mobile` package** in the monorepo
2. **Use Expo with development builds** for native module support
3. **Share code via internal packages** (shared-schema, potentially shared-logic)
4. **Build progressively** - start with core features, add complexity

### Technology Stack

| Concern | Library |
|---------|---------|
| Framework | Expo SDK 52+ with React Native |
| Navigation | React Navigation 7 |
| UI Library | Tamagui or React Native Paper |
| Bluetooth | react-native-ble-plx |
| SVG Rendering | react-native-svg |
| State Management | React Context + useReducer (same pattern) |
| GraphQL | graphql-request + graphql-ws |
| Offline Storage | expo-sqlite or @react-native-async-storage |
| Authentication | expo-secure-store + custom auth |
| Forms | React Hook Form |
| Animations | react-native-reanimated |

---

## Reusable Assets

### Fully Reusable (No Changes)

1. **Backend Package** (`packages/backend`)
   - GraphQL API works with any client
   - WebSocket subscriptions compatible
   - No changes required

2. **Shared Schema** (`packages/shared-schema`)
   - GraphQL schema definitions
   - TypeScript type definitions
   - GraphQL operations (queries, mutations, subscriptions)

3. **Database Package** (`packages/db`)
   - Server-side only, no changes needed

### Reusable with Adaptation

1. **Business Logic**
   - Queue reducer logic (`queue-control/reducer.ts`)
   - Hold state mappings and color constants
   - URL parameter encoding (for deep linking)
   - Climb data transformations

2. **Design Tokens** (`theme-config.ts`)
   - Colors, spacing values
   - Typography scale
   - Border radius values

3. **Constants**
   - Board type definitions
   - Hold state colors
   - Grade mappings

### Create New Shared Package

Consider creating `packages/shared-logic` for:
- Queue reducer
- Climb utilities
- Board configuration logic
- Common validation schemas

---

## Components Requiring Rebuild

### UI Components (Complete Rewrite)

| Web Component | Mobile Equivalent |
|--------------|-------------------|
| Ant Design components | Tamagui/RN Paper components |
| Search Drawer | Bottom Sheet with filters |
| Queue List | FlatList with gestures |
| Board Renderer | react-native-svg based |
| Climb Card | Native card component |
| Settings screens | Native settings UI |
| Auth forms | Native form components |

### Platform-Specific Features

| Feature | Web Technology | Mobile Technology |
|---------|---------------|-------------------|
| Bluetooth | Web Bluetooth API | react-native-ble-plx |
| Offline storage | IndexedDB | expo-sqlite / AsyncStorage |
| Deep linking | Next.js routing | React Navigation deep links |
| Push notifications | N/A | expo-notifications |
| Haptic feedback | N/A | expo-haptics |
| Screen wake lock | Wake Lock API | expo-keep-awake |

---

## Feature Implementation Plan

### Core Features (MVP)

1. **Board Visualization**
   - SVG rendering with react-native-svg
   - Touch handling for hold selection
   - Zoom/pan with react-native-gesture-handler
   - Mirroring support

2. **Bluetooth Connection**
   - Device discovery and pairing
   - LED control protocol (port existing logic)
   - Connection state management
   - Background reconnection

3. **Climb Search**
   - Filter by grade, quality, ascents
   - Setter search
   - Sort options
   - Infinite scroll results

4. **Queue Management**
   - Add/remove climbs
   - Reorder with drag-and-drop
   - Set current climb
   - Queue persistence

5. **Authentication**
   - Aurora Climbing login
   - Secure token storage
   - Session management

### Enhanced Features (Post-MVP)

1. **Party Mode**
   - Session creation/joining
   - Real-time sync
   - User presence
   - Leader controls

2. **Logbook**
   - Track ascents and attempts
   - Progress statistics
   - History view

3. **Favorites & Playlists**
   - Save favorite climbs
   - Create/manage playlists
   - Quick access

4. **Offline Mode**
   - Cache climb data
   - Queue offline changes
   - Sync when connected

5. **Push Notifications**
   - Party invitations
   - Queue updates when app backgrounded

---

## Technical Architecture

### Package Structure

```
boardsesh/
├── packages/
│   ├── web/                    # Existing Next.js app
│   ├── backend/                # Existing GraphQL backend
│   ├── shared-schema/          # GraphQL schema + types
│   ├── db/                     # Database schema
│   ├── shared-logic/           # NEW: Shared business logic
│   │   ├── src/
│   │   │   ├── queue/          # Queue reducer, actions
│   │   │   ├── board/          # Board config, hold mappings
│   │   │   ├── climb/          # Climb utilities
│   │   │   └── index.ts
│   │   └── package.json
│   └── mobile/                 # NEW: React Native app
│       ├── app/                # Expo Router app directory
│       │   ├── (tabs)/         # Tab navigation
│       │   ├── (auth)/         # Auth screens
│       │   ├── board/          # Board screens
│       │   ├── party/          # Party mode screens
│       │   └── _layout.tsx
│       ├── components/
│       │   ├── board/          # Board renderer
│       │   ├── queue/          # Queue components
│       │   ├── search/         # Search UI
│       │   ├── common/         # Shared components
│       │   └── bluetooth/      # Bluetooth controls
│       ├── hooks/
│       │   ├── useBluetooth.ts
│       │   ├── useQueue.ts
│       │   └── useParty.ts
│       ├── services/
│       │   ├── bluetooth/      # BLE protocol
│       │   ├── graphql/        # GraphQL client
│       │   └── storage/        # Local storage
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   ├── QueueContext.tsx
│       │   └── BluetoothContext.tsx
│       ├── theme/
│       │   └── tokens.ts       # Design tokens
│       ├── app.json            # Expo config
│       ├── package.json
│       └── tsconfig.json
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Screens   │  │  Components │  │   Context Providers │  │
│  │  (Expo      │──│  (Tamagui/  │──│  - Auth             │  │
│  │   Router)   │  │   RN Paper) │  │  - Queue            │  │
│  └─────────────┘  └─────────────┘  │  - Bluetooth        │  │
│                                     │  - Party            │  │
│                                     └─────────────────────┘  │
│         │                                    │               │
│         ▼                                    ▼               │
│  ┌─────────────┐                    ┌─────────────────────┐  │
│  │   Hooks     │                    │   Local Storage     │  │
│  │  - useQueue │                    │   - SQLite/         │  │
│  │  - useBLE   │                    │     AsyncStorage    │  │
│  └─────────────┘                    └─────────────────────┘  │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Unchanged)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │  GraphQL HTTP   │    │  GraphQL WS     │                 │
│  │  (Queries/      │    │  (Subscriptions)│                 │
│  │   Mutations)    │    │                 │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              GraphQL Yoga Server                         ││
│  │              + Room Manager + PubSub                     ││
│  └─────────────────────────────────────────────────────────┘│
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────┐  ┌───────────────┐                       │
│  │  PostgreSQL   │  │    Redis      │                       │
│  │  (Data)       │  │  (Pub/Sub)    │                       │
│  └───────────────┘  └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Bluetooth Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   BluetoothContext                           │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  - connectionState: 'disconnected' | 'scanning' |           │
│                     'connecting' | 'connected'               │
│  - device: Device | null                                     │
│  - error: Error | null                                       │
├─────────────────────────────────────────────────────────────┤
│  Actions:                                                    │
│  - startScan()                                               │
│  - connect(deviceId)                                         │
│  - disconnect()                                              │
│  - sendClimb(frames, holdStateMap)                          │
│  - clearBoard()                                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              BluetoothService (react-native-ble-plx)         │
├─────────────────────────────────────────────────────────────┤
│  - BleManager instance                                       │
│  - Device scanning with Aurora UUID filter                   │
│  - GATT service/characteristic discovery                     │
│  - Write commands with chunking (20 byte limit)             │
│  - Connection monitoring and auto-reconnect                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Bluetooth Protocol                          │
│         (Port from web: board-bluetooth-control/)            │
├─────────────────────────────────────────────────────────────┤
│  - Nordic UART Service UUID: 6e400001-...                   │
│  - Write Characteristic: 6e400002-...                        │
│  - Packet framing: FIRST(82), MIDDLE(81), LAST(83)          │
│  - Color encoding: RGB to 8-bit                              │
│  - Position encoding                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)

**Goals:** Project setup, core infrastructure, basic navigation

**Tasks:**
- [ ] Initialize Expo project with TypeScript
- [ ] Set up monorepo integration (npm workspaces)
- [ ] Configure React Navigation with Expo Router
- [ ] Create shared-logic package, extract queue reducer
- [ ] Set up Tamagui or React Native Paper with theme tokens
- [ ] Implement GraphQL client (HTTP + WebSocket)
- [ ] Create authentication flow (login, secure storage)
- [ ] Build basic navigation structure (tabs, stack)

**Deliverables:**
- Working app skeleton
- User can log in
- Navigation between placeholder screens

### Phase 2: Board Visualization (3-4 weeks)

**Goals:** Render climbing board, display climbs

**Tasks:**
- [ ] Port SVG board renderer to react-native-svg
- [ ] Implement hold rendering with state colors
- [ ] Add touch handling for hold selection
- [ ] Implement pinch-to-zoom and pan
- [ ] Create climb card component
- [ ] Build climb detail view
- [ ] Add mirroring support

**Deliverables:**
- Board displays correctly with holds lit up
- Can view climb details
- Touch interactions work smoothly

### Phase 3: Bluetooth Integration (3-4 weeks)

**Goals:** Connect to board hardware, control LEDs

**Tasks:**
- [ ] Set up react-native-ble-plx with Expo dev build
- [ ] Implement device scanning with Aurora filter
- [ ] Create connection management (connect, disconnect, reconnect)
- [ ] Port Bluetooth protocol (packet framing, color encoding)
- [ ] Build Bluetooth UI (scan modal, connection status)
- [ ] Add screen wake lock (expo-keep-awake)
- [ ] Test on physical devices with actual boards

**Deliverables:**
- Can discover and connect to board
- Sending climb lights up correct holds
- Connection survives app backgrounding

### Phase 4: Search & Queue (3-4 weeks)

**Goals:** Find climbs, manage queue

**Tasks:**
- [ ] Build search UI (filters, sort options)
- [ ] Implement infinite scroll results
- [ ] Port queue reducer to shared-logic
- [ ] Create queue list with drag-to-reorder
- [ ] Add climb to queue functionality
- [ ] Implement current climb selection
- [ ] Local queue persistence

**Deliverables:**
- Full search functionality
- Queue management works
- Queue persists between sessions

### Phase 5: Party Mode (3-4 weeks)

**Goals:** Real-time multi-user sessions

**Tasks:**
- [ ] Implement WebSocket subscription handling
- [ ] Port party session logic
- [ ] Create/join session UI
- [ ] User presence display
- [ ] Leader controls
- [ ] Queue sync between users
- [ ] Handle connection failures gracefully

**Deliverables:**
- Can create and join party sessions
- Real-time queue sync works
- Multiple users collaborate successfully

### Phase 6: Logbook & Progress (2-3 weeks)

**Goals:** Track climbing progress

**Tasks:**
- [ ] Implement tick tracking (ascents, attempts)
- [ ] Build logbook view
- [ ] Add progress statistics
- [ ] Create history timeline
- [ ] Sync with server

**Deliverables:**
- Can log ascents and attempts
- View climbing history
- Stats display correctly

### Phase 7: Polish & Launch Prep (2-3 weeks)

**Goals:** Production readiness

**Tasks:**
- [ ] Performance optimization
- [ ] Error handling and crash reporting (Sentry)
- [ ] Offline mode improvements
- [ ] App store assets (icons, screenshots)
- [ ] Privacy policy, terms of service
- [ ] Beta testing
- [ ] App store submission

**Deliverables:**
- Apps submitted to App Store and Play Store
- Production-ready builds

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| BLE protocol differences between platforms | Medium | High | Early testing on both iOS/Android with real hardware |
| SVG performance with complex boards | Medium | Medium | Profile early, consider Skia if needed |
| WebSocket reliability in mobile context | Low | High | Robust reconnection logic, offline queue |
| Expo limitations requiring eject | Low | Medium | Use dev builds from start, evaluate native modules early |

### Resource Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Underestimated UI rebuild effort | Medium | High | Start with core screens, iterate |
| Testing across device variety | Medium | Medium | Establish device test matrix early |
| App store approval delays | Medium | Low | Submit early, be prepared for review feedback |

### Timeline Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bluetooth debugging takes longer | High | Medium | Allocate buffer time, test on physical devices early |
| Feature creep from web parity expectations | Medium | High | Define MVP strictly, communicate tradeoffs |

---

## Success Criteria

### MVP Success Metrics

- [ ] App runs on iOS 15+ and Android 10+
- [ ] Can connect to Kilter/Tension boards via Bluetooth
- [ ] Can search, view, and send climbs to board
- [ ] Queue management works offline and online
- [ ] Party mode supports 2+ users simultaneously
- [ ] App Store and Play Store approved

### Performance Targets

- App launch to interactive: < 2 seconds
- Board render time: < 500ms
- Bluetooth connection time: < 5 seconds
- Search response time: < 1 second

---

## Appendix

### Recommended Libraries

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "react-native": "0.76.x",
    "react": "18.3.x",

    "expo-router": "~4.0.0",
    "@react-navigation/native": "^7.0.0",

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

    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.22.0"
  }
}
```

### iOS Bluetooth Permissions (Info.plist)

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Boardsesh needs Bluetooth to connect to your climbing board and control the LED holds.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Boardsesh needs Bluetooth to connect to your climbing board.</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>
```

### Android Bluetooth Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## Next Steps

1. **Validate approach** - Review this plan with stakeholders
2. **Set up mobile package** - Initialize Expo project in monorepo
3. **Proof of concept** - Build BLE connection + basic board render
4. **Iterate** - Begin Phase 1 implementation

---

*Document created: January 2026*
*Last updated: January 2026*
