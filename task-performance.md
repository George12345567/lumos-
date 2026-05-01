# Performance Enhancement Task for Lumos Website
## Claude Code Task Specification

You are working on a React/TypeScript marketing website at `D:\my web lumos\LAST LUMOS PROCECC`. The site uses React 18, Vite, TypeScript, and Tailwind CSS.

## Project Files

Key files you need:
- `D:\my web lumos\LAST LUMOS PROCECC\claude.md` - Project documentation
- `D:\my web lumos\LAST LUMOS PROCECC\phase.md` - Enhancement phases

## Your Task: Performance Enhancement

### Step 1: Read the documentation files
First, read both documentation files to understand the current state and tasks:
- Read `claude.md` for project overview
- Read `phase.md` for the enhancement plan

### Step 2: Check current bundle size
Run `npm run build` and note the current sizes:
```
Current bundle: ~870KB / ~280KB gzip
Target bundle: < 200KB / < 100KB gzip
```

### Step 3: Execute Enhancement Phases

#### Phase 1: Bundle Optimization

**Task 1.1: Lazy Load Studio Tabs**
- File: `src/features/live-preview/LivePreviewTool.tsx`
- Line 41: Find direct imports of studio tabs
- Change: Replace with React.lazy() imports
```typescript
// BEFORE:
import { BrandTab, StyleTab, LayoutTab, ContentTab, ExportTab, TemplateTab } from "./components/studio";

// AFTER:
const BrandTab = lazy(() => import("./components/studio/BrandTab"));
const StyleTab = lazy(() => import("./components/studio/StyleTab"));
// etc...
```

**Task 1.2: Lazy Load QRCodeSVG**
- File: `src/features/live-preview/LivePreviewTool.tsx`
- Change: Only import QRCodeSVG when QR modal opens
- Hint: Use React.lazy() for the import

**Task 1.3: Reduce Animated Elements**
- File: `src/features/hero/TypewriterHero.tsx`
- Change: Reduce 78 animated elements to ~30
- This reduces bundle size and improves performance

#### Phase 2: Over-Rendering Fix

**Task 2.1: Split LanguageContext**
- File: `src/context/LanguageContext.tsx`
- Change: Split into separate useLanguage() and useTranslation() hooks
- Reason: Components using only language state re-render when t() changes

**Task 2.2: Break LivePreviewTool useEffect**
- File: `src/features/live-preview/LivePreviewTool.tsx` (line ~572)
- Change: Split the 18-dependency useEffect into smaller focused effects
- Reason: Single effect re-runs on any of 18 state changes

**Task 2.3: Memoize FloatingDock**
- File: `src/components/layout/FloatingDock.tsx` (line ~263)
- Change: Wrap dockContent in useMemo
- Reason: Recalculated on every parent render

#### Phase 3: Memory Leaks Fix

**Task 3.1: FloatingDock Cleanup**
- File: `src/components/layout/FloatingDock.tsx`
- Change: Add proper cleanup for all intervals/timeouts
- Issues: Typewriter interval (28ms), guide timers

**Task 3.2: EnhancedNavbar Cleanup**
- File: `src/components/layout/EnhancedNavbar.tsx`
- Change: Remove remaining homeAi-related code
- Note: homeAi was marked for removal but some code may remain

#### Phase 4: Animation Optimization

**Task 4.1: Throttle Mouse Parallax**
- File: `src/features/hero/TypewriterHero.tsx`
- Change: Throttle mousemove with requestAnimationFrame or useCallback
- Reason: Triggers re-render on every mouse move

**Task 4.2: FloatingDock Apple-style Animation**
- File: `src/components/layout/FloatingDock.tsx`
- Change: Implement Apple- style magnification
- Formula: scale = base + (maxScale - base) * (1 - distance / maxDistance)
- Current: Basic hover scale only

#### Phase 5: Code Organization

**Task 5.1: Remove Duplicate Guide**
- Files: `EnhancedNavbar.tsx`, `FloatingDock.tsx`
- Change: Keep one guide location, remove duplicate
- Reason: Both have guide feature, one is enough

**Task 5.2: Clean Barrel Exports**
- File: `src/features/live-*/components/studio/index.ts`
- Change: Remove barrel export, use lazy imports
- Reason: Bundles all exports even when only one is used

### Step 4: Testing

After each change:
1. Run `npm run build`
2. Check for errors
3. Verify bundle size changes

### Important Rules

1. NEVER break the build
   - Always run `npm run build` after changes
   - If build fails, revert and try a different approach

2. Keep routes working
   - `/` - Home page
   - `/demo` - MobileDemoPage
   - `/services/:slug` - ServicePage

3. Test both languages
   - English (EN)
   - Arabic (AR)

### Success Criteria

After all phases:
- Bundle size: < 200KB JS
- Gzip: < 100KB
- No memory leaks
- No over-rendering
- Apple-style dock animation working
- Build passes

### Files to Modify (Priority Order)

1. HIGH PRIORITY:
   - `src/features/live- preview/LivePreviewTool.tsx`
   - `src/components/layout/FloatingDock.tsx`
   - `src/features/hero/TypewriterHero.tsx`

2. MEDIUM PRIORITY:
   - `src/context/LanguageContext.tsx`
   - `src/components/ layout/EnhancedNavbar.tsx`
   - `src/ features/live-preview/components/studio/index.ts`

3. LOW PRIORITY:
   - Other components as needed

### Starting Commands

```bash
# Check current state
npm run build

# Start development
npm run dev

# Run lint check
npm run lint
```

Good luck! Focus on performance, keep the build working, and document any issues.