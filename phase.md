# 🎯 Performance Enhancement Phases
## Current Status
- **Bundle:** ~870KB JS / ~280KB gzip
- **Target:** < 200KB JS / < 100KB gzip
- **Status:** ❌ Needs optimization

---

## Phase 1: Bundle Optimization
### Task 1.1: Lazy Load Studio Tabs
- **File:** `src/features/live-preview/LivePreviewTool.tsx`
- **Change:** Replace direct imports with `React.lazy()`
- **Expected Savings:** ~80KB

### Task 1.2: Lazy Load QRCodeSVG
- **File:** `src/features/live-preview/LivePreviewTool.tsx`
- **Change:** Load `qrcode.react` only when QR modal opens
- **Expected Savings:** ~15KB

### Task 1.3: Tree-Shake Icons
- **Files:** Multiple components importing full lucide-react
- **Change:** Import only used icons
- **Expected Savings:** ~20KB

### Task 1.4: Reduce Animated Elements
- **File:** `src/features/hero/TypewriterHero.tsx`
- **Change:** Reduce stars from 78 to ~30
- **Expected Savings:** ~15KB

---

## Phase 2: Over-Rendering Fix

### Task 2.1: Split LanguageContext
- **File:** `src/context/LanguageContext.tsx`
- **Change:** Separate `useLanguage()` and `useTranslation()` hooks
- **Reason:** Components using only language state shouldn't re-render on `t()` changes

### Task 2.2: Break LivePreviewTool useEffect
- **File:** `src/features/live-preview/LivePreviewTool.tsx` (line ~572)
- **Change:** Split 18-dependency useEffect into smaller focused effects
- **Reason:** Single effect re-runs on any of 18 state changes

### Task 2.3: Memoize FloatingDock
- **File:** `src/components/layout/FloatingDock.tsx` (line ~263)
- **Change:** Wrap dockContent in `useMemo`
- **Reason:** Recalculated on every parent render

---

## Phase 3: Memory Leaks Fix

### Task 3.1: FloatingDock Cleanup
- **File:** `src/components/layout/FloatingDock.tsx`
- **Change:** Add proper cleanup for all intervals/timeouts
- **Issues:** Typewriter interval, guide timers

### Task 3.2: EnhancedNavbar Cleanup
- **File:** `src/components/layout/EnhancedNavbar.tsx`
- **Change:** Remove remaining homeAi-related code with proper cleanup

---

## Phase 4: Animation Optimization

### Task 4.1: Throttle Mouse Parallax
- **File:** `src/features/hero/TypewriterHero.tsx`
- **Change:** Throttle mousemove with requestAnimationFrame
- **Reason:** Triggers re-render on every mouse move

### Task 4.2: Optimize FloatingDock Animation
- **File:** `src/components/layout/FloatingDock.tsx`
- **Change:** Add Apple-style magnification with proximity calculation
- **Current:** Basic hover scale
- **Target:** Icons scale based on mouse distance

---

## Phase 5: Code Organization

### Task 5.1: Remove Duplicate Guide Feature
- **Files:** `EnhancedNavbar.tsx`, `FloatingDock.tsx`
- **Change:** Keep one guide location, remove duplicate
- **Reason:** Both have guide, one is enough

### Task 5.2: Clean Up Barrel Exports
- **File:** `src/features/live-*/components/studio/index.ts`
- **Change:** Remove barrel, use lazy imports instead
- **Reason:** Bundles all exports even when unused

### Task 5.3: Remove Unused Code
- Scan for: Dead imports, commented code, unused exports
- Files: Multiple components

---

## Expected Results
| Phase | Task | Savings | Priority |
|-------|------|--------|----------|
| 1 | Lazy Load Tabs | ~80KB | HIGH |
| 1 | Lazy QRCode | ~15KB | MEDIUM |
| 1 | Tree- shake Icons | ~20KB | MEDIUM |
| 1 | Reduce Animation | ~15KB | LOW |
| 2 | Split Context | Performance | HIGH |
| 2 | Break useEffect | Performance | HIGH |
| 2 | Memoize Dock | Performance | MEDIUM |
| 3 | Cleanup Timers | Memory | HIGH |
| 4 | Throttle Mouse | Performance | MEDIUM |
| 5 | Remove Duplicate | ~5KB | LOW |

**Total Target Savings:** ~135KB+
**Target Bundle Size:** ~150KB gzip