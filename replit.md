# Sistema de Cashout - Real-time Betting Signals Dashboard

## Overview

This is a real-time betting signals dashboard application for the Aviator game, built as a Progressive Web App (PWA). The system provides live candle analysis, entry signals with cashout recommendations, and historical tracking of betting results. It features a dark-themed, mobile-first interface designed to resemble financial/trading dashboards with real-time data updates via Server-Sent Events (SSE).

The application targets Portuguese-speaking users in Mozambique and includes promotional integration for betting platforms and WhatsApp community groups.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### External Signal Integration - 100% Automatic (Oct 15)
- **Public API Discovery** - Found https://app.sscashout.online/api/velas is publicly accessible
- **Ultra-Fast Polling System** - Backend fetches velas every 1 second automatically (real-time!)
- **Zero Manual Intervention** - No console scripts needed, runs 24/7 on server
- **Smart Filtering**:
  - Validates velas between 1.00 and 99.99 (filters outliers like 336.83)
  - Selects first 4 valid velas from API response
  - Only updates when velas change (prevents duplicate processing)
- **Integration Flow**: SSCashout API → Backend (1s polling) → SSE broadcast → Frontend real-time update
- **Fallback Support**: Still accepts manual velas via POST /api/vela for compatibility
- **Documentation**: SISTEMA-AUTOMATICO.md explains automatic system architecture

### Critical Implementation Details

**Candle Ordering System** (Oct 7 - FINAL):
- External server (fonte-de-sinais.replit.app) returns candles as: `[recente, ..., antiga]` (e.g., `["1.11x", "3.70x", "6.03x", "2.30x", "1.00x"]`)
- Backend processing: `velasNumericas.slice(0, 4)` - takes first 4 candles (most recent)
- Internal array structure: `ultimasVelas[0]` = newest (leftmost), `ultimasVelas[3]` = oldest (rightmost)
- Frontend display: NO `.reverse()` - displays array as-is with newest on LEFT
- Signal "Depois de:" correctly uses `ultimasVelas[0]` (most recent candle)
- Validation: Uses first candle received after entry signal

**UI & Features** (Oct 6):
- Compact Velas Layout: 4 candles in horizontal scrollable row, 9px font, minimal padding (px-1 py-0.5)
- Footer: "Sistema desenvolvido por CYBER HACKER OFFICE"
- Signal Response: 2-second analysis interval for fast signal generation
- Push Notifications (web-push):
  - Entry: "Depois de X.XXx • Cashout X.XXx"
  - GREEN: "✅ GREEN! Vitória confirmada X.XXx"
  - LOSS: "❌ LOSS Tentativas esgotadas X.XXx"
  - Works when app closed (Service Worker)
  - Auto-cleanup of expired subscriptions

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- Single-page application (SPA) architecture with code splitting

**UI Component System**
- shadcn/ui component library (New York style variant) for consistent design patterns
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Dark mode as the primary theme with mobile-first responsive design
- Custom color palette based on financial dashboard aesthetics (deep blue-black backgrounds, green/red status indicators)

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management and caching
- Local component state (useState/useEffect) for UI-specific state
- Real-time updates via Server-Sent Events (SSE) connection
- Custom hooks for mobile detection and toast notifications

**Real-time Communication**
- SSE endpoint (`/api/stream`) for server-to-client push updates
- Event types: online count, candle updates, signal notifications, result updates
- Automatic reconnection handling with heartbeat mechanism
- Client-side deduplication of historical results using Set-based tracking

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for type-safe API development
- HTTP server with SSE support for real-time features
- Middleware-based request/response logging
- Static file serving for public assets and PWA resources

**API Design**
- RESTful endpoints for signal submission (`POST /api/sinal`)
- Result tracking endpoint (`POST /api/resultado`)
- Candle value updates (`POST /api/vela`)
- SSE stream endpoint (`GET /api/stream`) for real-time broadcasts
- Online user count endpoint (`GET /api/online`)

**Automatic Signal Generation System**
- Automated candle generation every 8-12 seconds (simulating Aviator game rounds)
- Pattern-based signal analysis using the last 5 candles
- Signal triggers when detecting favorable patterns (2+ low candles or low average)
- `apos_de` field uses the last candle from previous state (before new candle insertion)
- Automatic result tracking: WIN (status: 'green') or LOSS based on cashout target
- Win/loss determination includes martingale-style retry logic (max_gales attempts)

**In-Memory State Management**
- Connected clients tracked via Set of Response objects
- Temporary storage for latest candles (array of 5 recent values)
- Latest signal and result caching
- No persistent database for signal history (ephemeral data model)

**Broadcasting Mechanism**
- Server-side broadcast function sends JSON-formatted SSE messages to all connected clients
- Events include: online count updates, candle analysis, signal confirmations, result updates
- 30-second heartbeat to maintain connection health

### Data Storage Solutions

**Database Configuration**
- Drizzle ORM configured for PostgreSQL (via Neon serverless driver)
- Schema defined in `shared/schema.ts` with minimal user table
- Database migrations managed through drizzle-kit
- **Current Usage**: Minimal - only user authentication schema defined, but no active user authentication flow implemented

**Session Management**
- Connect-pg-simple for PostgreSQL-backed session storage
- Session configuration present but not actively used in current implementation

**Client-Side Storage**
- LocalStorage for client ID generation and persistence
- PWA manifest and service worker for offline capabilities
- Push notification subscription storage

### Authentication & Authorization

**Current State**: Authentication infrastructure is configured but not actively enforced
- User schema exists (username/password fields)
- Zod validation schemas defined for user insertion
- No active login/registration flow in the UI
- No protected routes or session validation middleware
- Storage layer includes user CRUD methods that are unused

**Design Decision**: The application prioritizes open access for signal viewing over user management, suggesting a pivot from planned authentication to anonymous usage.

### External Dependencies

**Database Service**
- Neon Serverless PostgreSQL (@neondatabase/serverless) for cloud-hosted database
- Configured via `DATABASE_URL` environment variable
- Uses WebSocket-based connection pooling for serverless environments

**Push Notifications**
- Web Push API integration via service worker (`public/sw.js`)
- VAPID key-based authentication for push subscriptions
- Notification triggers for new signals and entry confirmations
- Client-side permission handling and subscription management

**Third-Party Integrations**
- **Betting Platform**: Placard.co.mz affiliate link integration (PID: 3319, BID: 1690)
- **WhatsApp Community**: Group invitation link for user support and additional signals
- **Google Fonts**: Inter font family (weights 400, 600, 700) via CDN

**Modal System for Conversions**
- Timed modal displays (10s for platform sign-up, 40s delay for WhatsApp group)
- Sequential modal flow with automatic reopening after dismissal (3-minute cycle)
- Deep linking support for mobile WhatsApp and web platform access

**PWA Features**
- Service worker for push notifications and offline support
- Web manifest with app icons (192x192, 512x512)
- iOS safe area insets handling
- Standalone display mode for app-like experience

**Development Tools**
- Replit-specific plugins for development (runtime error overlay, cartographer, dev banner)
- TSX for TypeScript execution in development mode
- ESBuild for production bundling of server code