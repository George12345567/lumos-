# CLAUDE.md - Lumos Digital Ascent Project

## Project Overview

**Name:** Lumos Digital Ascent
**Type:** Marketing Website / Web Application
**Framework:** React 18 + TypeScript + Vite + Tailwind CSS
**Location:** `D:\my web lumos\LAST LUMOS PROCECC`

---

## Tech Stack

### Core
- **React** 18.3.1 - UI Framework
- **TypeScript** 5.8.3 - Type Safety
- **Vite** 7.2.4 - Build Tool
- **Tailwind CSS** 3.4.17 - Styling
- **Framer Motion** 12.23.24 - Animations

### UI Libraries
- **Radix UI** (@radix-ui/*) - Accessible UI primitives
- **Lucide React** - Icons
- **Shadcn/ui** - Component patterns
- **Recharts** - Charts
- **React Hook Form** + **Zod** - Form validation

### Data & Backend (Stubbed)
- **Supabase** (@supabase/supabase-js) - Backend (STUBBED, returns null)
- **TanStack Query** (@tanstack/react-query) - Data fetching

### Utilities
- **date-fns** - Date manipulation
- **clsx** + **tailwind-merge** - Conditional classes
- **sonner** - Toast notifications
- **React Router DOM** 6.30.1 - Routing
- **emailjs/browser** - Email sending

---

## Project Structure

```
src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # React entry point
├── index.css                  # Global styles
│
├── pages/                     # Route pages
│   ├── Index.tsx             # Home/landing page
│   ├── NotFound.tsx          # 404 page
│   ├── ServicePage.tsx        # Dynamic service pages
│   └── MobileDemoPage.tsx     # Live preview demo
│
├── components/
│   ├── ui/                   # Base UI components (Radix wrappers)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── input.tsx
│   │   └── [...50+ more]
│   │
│   ├── shared/               # Shared components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingFallback.tsx
│   │   ├── FloatingBrandButton.tsx
│   │   ├── GlobalLanguageToggle.tsx
│   │   └── AvatarGenerator.tsx
│   │
│   ├── layout/
│   │   ├── EnhancedNavbar.tsx    # Top navigation
│   │   └── FloatingDock.tsx     # Bottom dock (macOS style)
│   │
│   ├── pricing/
│   │   ├── PricingModal.tsx
│   │   └── pricingHelpers.tsx
│   │
│   └── admin/
│       └── ClientSheet.tsx
│
├── features/                  # Feature modules
│   ├── hero/
│   │   └── TypewriterHero.tsx   # Animated hero
│   ├── services/
│   │   └── EnhancedServices.tsx
│   ├── live-preview/
│   │   ├── LivePreviewTool.tsx  # Design studio (HEAVY - 200KB)
│   │   ├── templates/
│   │   └── components/studio/
│   ├── contact/
│   │   └── EnhancedContact.tsx
│   ├── faq/
│   │   └── FAQ.tsx
│   ├── process/
│   │   └── ProcessTimeline.tsx
│   ├── about/
│   │   └── AboutStats.tsx
│   ├── tech-stack/
│   │   └── TechStack.tsx
│   ├── lead-capture/
│   │   └── LeadCapturePopup.tsx
│   └── client-profile/
│       └── [client portal features]
│
├── context/                   # React contexts
│   ├── AuthContext.tsx       # Auth state (stubbed)
│   └── LanguageContext.tsx   # i18n (EN/AR)
│
├── hooks/                    # Custom hooks
│   ├── useScrollReveal.tsx
│   └── useGeolocation.tsx
│
├── lib/                      # Utilities
│   ├── supabaseClient.ts    # Stub - returns null
│   ├── utils.ts
│   ├── constants.ts
│   └── [other utilities]
│
├── services/                 # API services (all stubbed)
│   ├── authService.ts
│   ├── db.ts
│   ├── profileService.ts
│   ├── designService.ts
│   └── [more stubbed services]
│
├── data/                     # Static data
│   ├── homeAiResponses.ts
│   ├── pricing.ts
│   └── servicePages.ts
│
├── types/                    # TypeScript types
│   ├── index.ts
│   └── dashboard.ts
│
└── utils/
    ├── analytics.js
    └── CalculatorEngine.js
```

---

## Available Commands

```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Index | Home page |
| `/demo` | MobileDemoPage | Live preview demo |
| `/services/:slug` | ServicePage | Dynamic service page |
| `*` | NotFound | 404 page |

---

## Key Components

### FloatingDock (Apple-Style Dock)
**File:** `src/components/layout/FloatingDock.tsx`
- Bottom floating navigation
- macOS-style animations
- Multiple variants: Guest, Authenticated, Client Profile
- Guide popup (shows after 30 seconds)

**Current Animation:**
- Spring reveal animation
- Mouse-following zoom (basic)
- Typewriter effect for guide text

**NEEDS:**
- Apple-style magnification (scale based on mouse proximity)
- Performance optimization (memoization)
- Cleanup for intervals/timers

---

### EnhancedNavbar (Top Navigation)
**File:** `src/components/layout/EnhancedNavbar.tsx`
- Logo and navigation links
- Pricing button
- Language toggle (EN/AR)
- Get Started menu
- Guide popup dialog

**NEEDS:**
- Remove duplicate guide (already has one in FloatingDock)
- Cleanup remaining homeAi code

---

### LivePreviewTool (Design Studio)
**File:** `src/features/live-preview/LivePreviewTool.tsx`
- Full design customization tool
- 6 studio tabs: Template, Layout, Content, Style, Brand, Export
- 40KB bundle (TOO LARGE)

**ISSUES:**
- All 6 tabs bundled together
- QRCodeSVG imported but only used in modal
- 60+ icons imported
- 18-dependency useEffect causing re-renders

**NEEDS:**
- Lazy load each tab individually
- Lazy load QRCodeSVG
- Break up useEffect dependencies

---

### TypewriterHero (Animated Hero)
**File:** `src/features/hero/TypewriterHero.tsx`
- Animated text with typewriter effect
- Parallax stars and particles
- ~80KB bundle

**ISSUES:**
- 78 animated elements (too many)
- Mouse parallax re-calculates on every move
- No throttling

**NEEDS:**
- Reduce elements to ~30
- Throttle mousemove
- Optimize animation performance

---

## Performance Issues (Priority Order)

### CRITICAL (Fix First)
1. **LivePreviewTool bundle size** - 200KB+, need lazy load tabs
2. **18-dependency useEffect** - re-runs on any state change
3. **Memory leaks** - FloatingDock intervals not cleaned up

### HIGH
4. **Barrel imports** - bundling all exports
5. **TypewriterHero** - too many animated elements
6. **Context over-rendering** - LanguageContext triggers all consumers

### MEDIUM
7. **Icons not tree-shaken** - importing entire library
8. **FloatingDock not memoized** - recalculates every render
9. **Mouse parallax not throttled** - triggers on every move

---

## Stubbed Services

All services in `src/services/` return stubbed responses:

```typescript
// Example: authService.ts
export async function login() {
  return { success: false, error: "Auth removed" };
}
```

This means:
- No real authentication
- No database operations
- No saved designs
- Contact forms don't actually send
- Pricing requests don't save

The frontend works but is non-functional for user accounts.

---

## Enhancement Goals

### Performance Targets
- **Bundle Size:** < 200KB (currently ~870KB)
- **Gzip:** < 100KB (currently ~280KB)
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s

### Code Quality
- Remove duplicate guide features
- Clean up barrel exports
- Add proper TypeScript types
- Optimize animations

---

## Important Notes

1. **Supabase is REMOVED** - All auth/backend stubbed
2. **AI Chat is REMOVED** - No Lumos AI functionality
3. **Routes reduced to 4** - Only public pages remain
4. **Language:** Supports English (EN) and Arabic (AR)
5. **Build works** - `npm run build` passes

---

## For AI Agent Working on This Project

### What to Do First
1. Read `phase.md` for prioritized task list
2. Run `npm run build` to check current state
3. Run `npm run dev` to test changes

### Key Files to Modify
- `src/features/live-preview/LivePreviewTool.tsx` - Bundle optimization
- `src/features/hero/TypewriterHero.tsx` - Animation optimization
- `src/components/layout/FloatingDock.tsx` - Memoization + Apple animation
- `src/context/LanguageContext.tsx` - Split contexts

### Testing
- Always run `npm run build` after changes
- Check browser console for errors
- Test both EN and AR languages

### Don't Break
- Build must pass (`npm run build`)
- Routes must work (`/`, `/demo`, `/services/:slug`)
- Language toggle must work
- Pricing modal must open