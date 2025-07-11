# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoardSesh is a Next.js 15 application for controlling standardized interactive climbing training boards (Kilter, Tension, Decoy). It adds missing functionality to boards using Aurora Climbing's software, including queue management and real-time collaborative control.

## Commands

### Development Setup
```bash
# One-time database setup
cd db/ && docker-compose up

# Create .env.development.local with:
VERCEL_ENV=development
POSTGRES_URL=postgresql://default:password@localhost:54320/verceldb

# For shared sync to work, add Aurora API tokens:
KILTER_SYNC_TOKEN=your_kilter_token_here
TENSION_SYNC_TOKEN=your_tension_token_here

# Note: VERCEL_URL is automatically set by Vercel for deployments
# For local development, the app defaults to http://localhost:3000

# Install and run
npm install
npm run dev
```

### Common Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Run database migrations and build for production
- `npm run lint` - Run ESLint
- `npm run lint-fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

### Database Commands
- `npx drizzle-kit generate` - Generate new migrations
- `npx drizzle-kit migrate` - Apply migrations (also runs on build)
- `npx drizzle-kit studio` - Open Drizzle Studio for database exploration

## Architecture Overview

### Routing Pattern
The app uses deeply nested dynamic routes:
```
/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/...
```
- Routes mirror the API structure at `/api/v1/...`
- Board names: "kilter", "tension", "decoy"
- All route segments are required for board-specific pages

We are using next.js app router, it's important we try to use server side components as much as possible. 

### Key Architectural Components

#### Context Providers
1. **BoardProvider** (`app/components/board-provider-context.tsx`)
   - Manages authentication and user sessions
   - Handles logbook entries and ascent tracking
   - Uses IndexedDB for offline persistence

2. **QueueProvider** (`app/components/queue-context.tsx`)
   - Manages climb queue with reducer pattern
   - Integrates with search results and suggestions

3. **PeerProvider** (`app/components/peer-context.tsx`)
   - WebRTC connections via PeerJS
   - Real-time queue synchronization
   - Broadcasts updates to connected peers

#### Data Flow
1. **Server Components**: Initial data fetching in page components
2. **Client Components**: Interactive features with SWR for data fetching
3. **API Routes**: Two patterns:
   - `/api/internal/...` - Server-side data operations
   - `/api/v1/[board]/proxy/...` - Aurora API proxies
4. **State Management**: React Context + useReducer for complex state

### Database Schema
- Separate tables for each board type (kilter_*, tension_*)
- Key entities: climbs, holds, layouts, sizes, sets, user_syncs
- Stats tracking with history tables
- See `app/lib/db/schema.ts` for full schema

### Key Integration Points
1. **Web Bluetooth**: Board LED control via Web Bluetooth API
2. **PeerJS**: Real-time collaboration using WebRTC
3. **IndexedDB**: Offline storage for auth and queue state
4. **Aurora API**: External API integration for user data sync

### Type System
- Core types in `app/lib/types.ts`
- Board-specific types in manufacturer directories
- Zod schemas for API validation
- Strict TypeScript configuration

### Testing
- Vitest configured but tests not yet implemented
- Run tests with `npm test` when available

## Development Guidelines

### Important rules
- Always try to use server side rendering wherever possibe. But do note that for some parts such as the QueueList and related components, thats impossible, so dont try to force SSR there.
- Always use the AntD components and their properties.
- Try to avoid use of the style property
- Always use CSS media queries for mobile/responsive design
- For rendering avoid JavaScript breakpoint detection & Grid.useBreakpoint()
- While we work together, be careful to remove any code you no longer use, so we dont end up with lots of deadcode

### Component Structure
- Server Components by default
- Client Components only when needed (interactivity, browser APIs)
- Feature-based organization in `app/components/`

### API Development
- Follow existing REST patterns
- Use Zod for request/response validation
- Implement both internal and proxy endpoints as needed

### State Management
- URL parameters as source of truth for board configuration
- Context for cross-component state
- IndexedDB for persistence

### Mobile Considerations
- iOS Safari lacks Web Bluetooth support
- Recommend Bluefy browser for iOS users
- Progressive enhancement for core features