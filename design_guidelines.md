# Design Guidelines - Aplicação Fullstack React/Node.js

## Design Approach: Modern Web Application System

**Selected Approach:** Design System-Based (Material Design/Tailwind Modern)
**Justification:** Aplicação fullstack funcional requer interface clara, eficiente e escalável que priorize usabilidade e consistência.

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- Background: 222 47% 11% (deep charcoal)
- Surface: 223 47% 16% (elevated panels)
- Primary: 217 91% 60% (vibrant blue)
- Accent: 142 76% 36% (emerald green, use sparingly)
- Text Primary: 210 40% 98%
- Text Secondary: 215 20% 65%
- Border: 217 33% 25%

**Light Mode:**
- Background: 0 0% 100%
- Surface: 210 20% 98%
- Primary: 217 91% 60%
- Accent: 142 76% 36%
- Text Primary: 222 47% 11%
- Text Secondary: 215 16% 47%
- Border: 214 32% 91%

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - UI, body text
- Monospace: 'JetBrains Mono' - code, technical data

**Scale:**
- Headings: font-bold, text-3xl (h1), text-2xl (h2), text-xl (h3)
- Body: font-normal, text-base
- Small: font-medium, text-sm
- Micro: font-medium, text-xs

### C. Layout System

**Spacing Units:** Standardized on 2, 4, 6, 8, 12, 16 (e.g., p-4, gap-6, mt-8, mb-12)

**Grid System:**
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Cards: gap-6 on mobile, gap-8 on desktop
- Sections: py-12 md:py-16 lg:py-20

### D. Component Library

**Navigation:**
- Top navigation bar: sticky, backdrop-blur-md, h-16
- Sidebar (if needed): w-64, collapsible on mobile
- Breadcrumbs for deep navigation hierarchies

**Forms:**
- Input fields: rounded-lg border-2, focus:ring-2 ring-primary/20
- Labels: font-medium text-sm mb-2
- Buttons: rounded-lg px-6 py-2.5, primary and ghost variants
- Form groups: space-y-4

**Data Display:**
- Tables: striped rows, sticky headers, hover states
- Cards: rounded-xl shadow-sm border, p-6
- Stats/Metrics: Large numbers (text-4xl font-bold) with descriptive labels
- Lists: clean separators, adequate padding (py-4)

**Feedback Elements:**
- Toasts: top-right positioning, auto-dismiss
- Modals: centered, max-w-2xl, backdrop blur
- Loading states: skeleton screens matching content structure
- Empty states: centered icon + message + action

**Interactive Elements:**
- Primary buttons: bg-primary text-white hover:bg-primary/90
- Secondary buttons: border-2 border-primary text-primary hover:bg-primary/5
- Ghost buttons on images: backdrop-blur-md bg-white/10 border border-white/20
- Icon buttons: p-2 rounded-lg hover:bg-surface

### E. Interaction Patterns

**Microinteractions:**
- Button hover: subtle scale (hover:scale-105) only where appropriate
- Card hover: shadow elevation increase (hover:shadow-lg)
- Form focus: border color transition + ring appearance
- Page transitions: smooth fade-in (150ms ease)

**Animations:** Minimal and purposeful
- Use transition-colors for color changes
- Use transition-transform for subtle movements
- Avoid excessive animations that distract from functionality

---

## Page Layouts

**Dashboard/Main App View:**
- Two-column: Sidebar (navigation) + Main content area
- Three-zone header: Logo/Brand | Navigation | User actions
- Content cards in responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

**Forms/Data Entry:**
- Single column, max-w-2xl centered
- Progressive disclosure for complex forms
- Clear section groupings with subtle dividers

**Data Tables:**
- Full-width within container
- Sticky header on scroll
- Action column always visible (right-aligned)
- Pagination or infinite scroll at bottom

---

## Images

**Strategic Image Use:**
- Authentication pages: Full-height split layout (50% form, 50% branded image)
- Dashboard empty states: Centered illustrations (max-w-md) with call-to-action
- User profiles/avatars: Circular (rounded-full) with fallback initials
- Feature highlights: 3:2 aspect ratio, rounded-lg, consistent sizing

**Hero Section (if applicable):**
- Large, high-quality image: Full-width, h-96 to h-screen on desktop
- Overlay gradient: from-black/60 to-transparent for text readability
- CTA positioned: Lower-left or center with backdrop-blur support

---

## Accessibility & Quality

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Focus indicators visible on all interactive elements (ring-2)
- Form error states: red-500 border + descriptive error text below
- Success states: green-500 border + confirmation message
- Consistent dark mode across all components including inputs/selects
- Keyboard navigation fully supported (tab order, escape to close modals)

---

This design system ensures a professional, functional, and scalable interface perfectly suited for a modern fullstack web application with database interactions and complex data management.