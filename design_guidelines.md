# Design Guidelines - Sistema de Cashout

## Design Approach
**Reference-Based Approach**: This is a specialized real-time betting signals dashboard. The design follows established patterns for financial/trading dashboards with real-time data visualization, similar to trading platforms and live betting interfaces.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary Theme)**:
- Background: `#0B0F14` (deep dark blue-black)
- Card backgrounds: `#1a2332` to `#0f1419` (gradient)
- Border accent: `#22c55e` (green for success/active states)
- Warning accent: `#f59e0b` (amber for alerts)

**Status Colors**:
- Green (WIN): `#22c55e` / `#16a34a` (hover) / `#36d27a` (text)
- Green background: `#0f2b1a`
- Loss (RED): `#ff5c5c` / Red backgrounds: `#2b0f0f`
- Neutral: `#60a5fa` (blue)
- Purple: `#a855f7` (for mid-range values)
- Pink: `#ec4899` (for high values)

**Text Colors**:
- Primary text: `#ffffff`
- Secondary text: `#d1d5db`
- Muted text: `#9ca3af`

### B. Typography

**Font Family**: Inter (Google Fonts)
- Weights: 400 (normal), 600 (semibold), 700 (bold)
- All text uses Inter font stack

**Hierarchy**:
- H1 (App Title): Bold, prominent
- H2 (Section Headers): 20px, bold, uppercase with letter-spacing
- H3 (Subsections): Semibold
- Body: 15px, normal weight, line-height 1.6
- Labels: Uppercase, letter-spacing for emphasis

### C. Layout System

**Spacing**: Mobile-first responsive design
- Card padding: 24-28px
- Section gaps: 12-16px between elements
- Consistent use of flexbox for layouts

**Container Strategy**:
- Single column layout on mobile
- Full-width cards with safe-area padding for iOS
- Max-width constraints on desktop (implied by mobile-first approach)

### D. Component Library

**App Bar (Header)**:
- Fixed top position with brand logo (192x192px icon)
- Title + subtitle (connection status)
- Live status chip with pulse animation
- Dark background with subtle transparency

**Cards**:
- Rounded corners (16px border-radius)
- Dark gradient backgrounds
- Colored borders for emphasis (green/amber)
- Shadow/depth for elevation
- "mini" variant for compact displays

**Velas (Candle Analysis)**:
- Horizontal pill display with inline styles
- Color-coded by value: Blue (1-2x), Purple (2-10x), Pink (10x+)
- Animated "analyzing" state with pulsing dots
- Background colors match value ranges

**Entry Metrics Grid**:
- 3-column grid for key metrics
- Label + Value pairs
- Large, readable value display
- "Tirar em" (cashout) emphasis

**Status Pills**:
- Rounded capsules
- Color-coded (green/loss/neutral)
- Bold text, uppercase
- Inline with content

**History List**:
- Chronological, newest first
- Time + metadata chips + status badge
- Filter chips (All/Green/Loss) with aria-pressed states
- Deduplicated entries, max 50 visible

**Buttons**:
- Primary: Green background (`#22c55e`), white text, 14-16px padding
- Warning: Same style with amber color
- Secondary: Gray (`#4b5563`) with hover states
- Uppercase text, bold weight
- 8px border-radius
- Full-width or flex layouts

**Modals**:
- Full-screen overlay with rgba(0,0,0,0.8) backdrop
- Centered card with gradient background
- Colored borders (green/amber) for distinction
- Close button (×) top-right
- Timed auto-display logic
- Call-to-action buttons prominently displayed

**Toast Notifications**:
- Status role, aria-live="polite" for accessibility
- Positioned for visibility without blocking content

### E. Interactions & Animations

**Pulse Animation**: 
- On live status indicator
- Continuous subtle pulse for "analyzing" state

**Hover States**:
- Buttons: Darker shade on hover (defined inline)
- Smooth color transitions (0.2s)

**Real-time Updates**:
- Instant DOM updates for velas, status, and history
- No loading spinners - direct content replacement
- Smooth color transitions for status changes

**Pull-to-Refresh**: 
- Hint text at bottom of history section

## Special Considerations

**Mobile Optimization**:
- iOS safe-area support via wrapper div
- Touch-friendly button sizes (minimum 44px tap targets)
- Full viewport utilization

**Accessibility**:
- Portuguese language (lang="pt")
- ARIA labels for status indicators
- aria-live regions for dynamic content
- aria-pressed states for filter buttons

**Real-time Features**:
- SSE connection status always visible
- Visual feedback for connection state
- Push notification prompts with prominent CTA
- Heartbeat monitoring (40s timeout)

**Progressive Web App**:
- Manifest.json reference
- Theme color meta tag
- Service Worker for push notifications
- App-like experience on mobile

**Content Strategy**:
- All text in Portuguese
- Automatic text replacement ("Cashout" → "Tirar em")
- Timed modal displays (10s, 40s, 3min cycles)
- Affiliate links integrated contextually

## Images
No hero images. The interface is data-driven with real-time information display. The only image asset is the app icon (192x192px logo) in the header.