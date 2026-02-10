# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boardsesh is a monorepo containing a Next.js 15 application for controlling standardized interactive climbing training boards (Kilter, Tension). It adds missing functionality to boards using Aurora Climbing's software, including queue management and real-time collaborative control.

## Documentation

Before working on a specific part of the codebase, check the `docs/` directory for relevant documentation:

- `docs/websocket-implementation.md` - WebSocket party session architecture, connection flow, failure states and recovery mechanisms
- `docs/ai-design-guidelines.md` - Comprehensive UI design guidelines, patterns, and tokens for redesigning components

**Important:**
- Read the relevant documentation first to understand the architecture and design decisions before making changes
- When making significant changes to documented systems, update the corresponding documentation to keep it in sync

## Monorepo Structure

```
/packages/
  /web/           # Next.js web application
  /backend/       # WebSocket backend for party mode (graphql-ws)
  /shared-schema/ # Shared GraphQL schema and TypeScript types
  /db/            # Shared database schema, client, and migrations (drizzle)
```

## Commands

### Development Setup

```bash
# Start development databases (PostgreSQL, Neon proxy, Redis)
npm run db:up

# Environment files are in packages/web/:
# .env.local contains generic config (tracked in git)
# .env.development.local contains secrets (NOT tracked in git)

# For shared sync to work, add Aurora API tokens to packages/web/.env.development.local:
KILTER_SYNC_TOKEN=your_kilter_token_here
TENSION_SYNC_TOKEN=your_tension_token_here

# Note: VERCEL_URL is automatically set by Vercel for deployments
# For local development, the app defaults to http://localhost:3000

# Install all dependencies (from root)
npm install

# Start web development server
npm run dev

# Start backend development server
npm run backend:dev
```

### Common Commands (from root)

- `npm run dev` - Start web development server with Turbopack
- `npm run build` - Build all packages
- `npm run build:web` - Build web package only
- `npm run build:backend` - Build backend package only
- `npm run lint` - Run oxlint on web package
- `npm run typecheck` - Type check all packages (use this instead of build for validation)
- `npm run typecheck:web` - Type check web package only
- `npm run typecheck:backend` - Type check backend package only
- `npm run typecheck:db` - Type check db package only
- `npm run typecheck:shared` - Type check shared-schema package only
- `npm run backend:dev` - Start backend in development mode
- `npm run backend:start` - Start backend in production mode
- `npm run db:up` - Start development databases (PostgreSQL, Neon proxy, Redis)

### Database Commands (run from root or packages/db/)

- `npm run db:migrate` - Apply migrations (also runs on Vercel build)
- `npm run db:studio` - Open Drizzle Studio for database exploration
- From packages/db: `npx drizzle-kit generate` - Generate new migrations

### Creating Database Migrations

**IMPORTANT**: Always use `npx drizzle-kit generate` from `packages/db/` to create new migrations. This command:
1. Detects schema changes in `packages/db/src/schema/`
2. Generates the SQL migration file in `packages/db/drizzle/`
3. Automatically adds the migration to `packages/db/drizzle/meta/_journal.json`

**Never manually create migration SQL files** without adding them to `_journal.json`. The journal tracks which migrations drizzle-kit should run - migrations missing from the journal will be silently skipped during deployment.

```bash
# From packages/db directory:
npx drizzle-kit generate

# Then apply locally to test:
npm run db:migrate
```

## Architecture Overview

### Routing Pattern

The app uses deeply nested dynamic routes:

```
/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/...
```

- Routes mirror the API structure at `/api/v1/...`
- Board names: "kilter", "tension"
- All route segments are required for board-specific pages

We are using next.js app router, it's important we try to use server side components as much as possible.

### Key Architectural Components

#### Context Providers

1. **BoardProvider** (`packages/web/app/components/board-provider-context.tsx`)
   - Manages authentication and user sessions
   - Handles logbook entries and ascent tracking
   - Uses IndexedDB for offline persistence

2. **QueueProvider** (`packages/web/app/components/queue-control/queue-context.tsx`)
   - Manages climb queue with reducer pattern
   - Integrates with search results and suggestions
   - Syncs with backend via GraphQL subscriptions

#### Data Flow

1. **Server Components**: Initial data fetching in page components
2. **Client Components**: Interactive features with SWR for data fetching
3. **API Routes**: Two patterns:
   - `/api/internal/...` - Server-side data operations
   - `/api/v1/[board]/proxy/...` - Aurora API proxies
4. **State Management**: React Context + useReducer for complex state

### Database Schema

- Separate tables for each board type (kilter*\*, tension*\*)
- Key entities: climbs, holds, layouts, sizes, sets, user_syncs
- Stats tracking with history tables
- See `packages/db/src/schema/` for full schema (re-exported via `packages/web/app/lib/db/schema.ts`)

### Key Integration Points

1. **Web Bluetooth**: Board LED control via Web Bluetooth API
2. **GraphQL-WS Backend**: Real-time collaboration via WebSocket GraphQL subscriptions
3. **Redis**: Pub/sub for multi-instance backend scaling
4. **IndexedDB**: Offline storage for auth and queue state
5. **Aurora API**: External API integration for user data sync

### Type System

- Core types in `packages/web/app/lib/types.ts`
- Shared types in `packages/shared-schema/src/types.ts`
- GraphQL schema in `packages/shared-schema/src/schema.ts`
- Zod schemas for API validation
- Strict TypeScript configuration

### Testing

- Vitest configured but tests not yet implemented
- Run tests with `npm test` when available

## Development Guidelines

### Important rules

- **Use `npm run typecheck` instead of `npm run build` for TypeScript validation** - Running build interferes with the local dev server and `npx` commands can mess with lock files. Use the typecheck scripts for validating TypeScript.
- Always try to use server side rendering wherever possibe. But do note that for some parts such as the QueueList and related components, thats impossible, so dont try to force SSR there.
- Always use MUI (Material UI) components and their properties.
- Try to avoid use of the style property
- Always use design tokens from `packages/web/app/theme/theme-config.ts` for colors, spacing, and other design values - never use hardcoded values
- Always use CSS media queries for mobile/responsive design
- For rendering avoid JavaScript breakpoint detection & Grid.useBreakpoint()
- While we work together, be careful to remove any code you no longer use, so we dont end up with lots of deadcode

### Component Structure

- Server Components by default
- Client Components only when needed (interactivity, browser APIs)
- Feature-based organization in `packages/web/app/components/`

### API Development

- Follow existing REST patterns
- Use Zod for request/response validation
- Implement both internal and proxy endpoints as needed

### Database Queries: Prefer Drizzle ORM

**Always use Drizzle ORM query builder** (`db.select()`, `db.insert()`, `db.update()`, `db.delete()`) for database operations. Only fall back to raw SQL (`sql` template literals from `drizzle-orm`) when the query genuinely cannot be expressed with the query builder (complex JOINs with type casts, window functions, CTEs, EXISTS subqueries, complex aggregations).

- **Never use the raw Neon `sql` client** (`import { sql } from '@/app/lib/db/db'`) for new code. Use Drizzle's `db` instance instead (`getDb()` or `dbz`), which provides type safety and schema validation.
- When raw SQL is necessary, use `db.execute(sql`...`)` with Drizzle's `sql` from `drizzle-orm` — not the Neon HTTP client directly.
- Both are safe from SQL injection (parameterized), but Drizzle gives you type safety and schema awareness.

### Client-Side Storage: IndexedDB Only

**Never use `localStorage` or `sessionStorage`**. All client-side persistence must use IndexedDB via the `idb` package.

- **Simple key-value preferences** (e.g., view mode, party mode): Use the shared utility at `packages/web/app/lib/user-preferences-db.ts` which provides `getPreference<T>(key)`, `setPreference(key, value)`, and `removePreference(key)`.
- **Domain-specific data** (e.g., recent searches, session history, onboarding status): Create a dedicated `*-db.ts` file in `packages/web/app/lib/` following the established pattern (lazy `dbPromise` init, SSR guard, try-catch error handling). See `tab-navigation-db.ts` or `onboarding-db.ts` for examples.
- All IndexedDB access must be guarded with `typeof window === 'undefined'` checks for SSR compatibility.
- When migrating a value from `localStorage` to IndexedDB, include one-time migration logic that reads the old key, writes to IndexedDB, and deletes the localStorage key. See `user-preferences-db.ts` (`getPreference` fallback), `recent-searches-storage.ts`, and `party-profile-db.ts` for examples.
- The only acceptable `localStorage` references are in one-time migration code that reads old data and deletes it.

### State Management

- URL parameters as source of truth for board configuration
- Context for cross-component state
- IndexedDB for persistence

### Mobile Considerations

- iOS Safari lacks Web Bluetooth support
- Recommend Bluefy browser for iOS users
- Progressive enhancement for core features
