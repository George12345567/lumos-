/**
 * ═══════════════════════════════════════════════════════════════════
 * AvatarGenerator 4.0 - Nano Banana Edition
 * ═══════════════════════════════════════════════════════════════════
 *
 * 8 premium generative art styles:
 *  1. nanoBanana  — AI neural-mesh portrait (animated gradient blobs)
 *  2. cosmicDust  — Stardust particle cloud (SVG particles + radials)
 *  3. liquidMetal — Chrome mercury sphere (reflective distortion)
 *  4. crystalFacet— Low-poly gem (triangular facets)
 *  5. neonPulse   — Pulsing neon ring (animated stroke)
 *  6. holographic  — Iridescent hologram (rainbow shimmer)
 *  7. origami      — Paper-fold geometric (clean triangles)
 *  8. photo        — Photo booth with filters (kept)
 *
 * All styles are pure SVG/CSS — no external API needed.
 * Seed-based determinism preserved.
 * ═══════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useId } from 'react';
import { motion } from 'framer-motion';

// ─── Types & Props ───────────────────────────────────────────────

export type AvatarStyle =
  | 'nanoBanana'
  | 'cosmicDust'
  | 'liquidMetal'
  | 'crystalFacet'
  | 'neonPulse'
  | 'holographic'
  | 'origami'
  | 'photo'
  // Legacy aliases (mapped automatically)
  | 'mesh'
  | 'abstract'
  | 'glass'
  | 'monogram'
  | 'geometric'
  | 'pixel';

export type PhotoFilter = 'none' | 'glitch' | 'duotone' | 'pixelate' | 'prism';

export interface AvatarGeneratorProps {
  seed: string;
  style?: AvatarStyle;
  size?: number;
  colors?: string[];
  imageUrl?: string;
  filter?: PhotoFilter;
  glow?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  ring?: boolean;
  ringColor?: string;
  staticRender?: boolean;
}

// ─── Math & RNG ──────────────────────────────────────────────────

function hash(str: string): number {
  let h = 0 ^ 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}

function rng(seed: string, index: number = 0): number {
  return hash(seed + '#' + index);
}

function pick<T>(arr: T[], seed: string, index: number = 0): T {
  return arr[Math.floor(rng(seed, index) * arr.length)];
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

// ─── Palettes ────────────────────────────────────────────────────

const PALETTES = {
  modern: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
  midnight: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b'],
  sunset: ['#ff5a5f', '#ff8a5b', '#ffb347', '#ffcc33', '#ffeead'],
  ocean: ['#0077b6', '#0096c7', '#48cae4', '#90e0ef', '#caf0f8'],
  forest: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'],
  neon: ['#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
  aurora: ['#00d2ff', '#928dab', '#614385', '#516395', '#a8edea'],
  lava: ['#ff4e50', '#f9d423', '#fc5c7d', '#6a3093', '#e44d26'],
};

function getPalette(seed: string, custom?: string[]): string[] {
  if (custom && custom.length > 1) return custom;
  const keys = Object.keys(PALETTES) as (keyof typeof PALETTES)[];
  return PALETTES[keys[Math.floor(rng(seed, 99) * keys.length)]];
}

/** Map legacy style names to new ones */
function resolveStyle(style: AvatarStyle): AvatarStyle {
  const map: Partial<Record<AvatarStyle, AvatarStyle>> = {
    mesh: 'nanoBanana',
    abstract: 'origami',
    glass: 'liquidMetal',
    monogram: 'crystalFacet',
    geometric: 'origami',
    pixel: 'cosmicDust',
  };
  return map[style] || style;
}

// ═══════════════════════════════════════════════════════════════════
// 1. NANO BANANA — AI Neural-Mesh Portrait
// ═══════════════════════════════════════════════════════════════════

const NanoBananaAvatar: React.FC<{ seed: string; size: number; colors: string[]; animated?: boolean }> = ({
  seed, size, colors, animated,
}) => {
  const uid = useId();
  const blobs = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => ({
      x: 20 + rng(seed, i) * 60, y: 20 + rng(seed, i + 10) * 60,
      r: 25 + rng(seed, i + 20) * 40, color: colors[i % colors.length], idx: i,
    })), [seed, colors]);

  const mirrorBlobs = useMemo(() =>
    blobs.slice(0, 3).map((b, i) => ({ ...b, x: 100 - b.x, idx: blobs.length + i })), [blobs]);

  const allBlobs = [...blobs, ...mirrorBlobs];

  return (
    <div style={{ width: size, height: size, overflow: 'hidden', background: colors[0] }} className="relative">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id={`nb-blur-${uid}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.4 -0.3" />
          </filter>
          <radialGradient id={`nb-center-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g filter={`url(#nb-blur-${uid})`}>
          {allBlobs.map((b) => (
            <motion.circle key={b.idx} cx={b.x} cy={b.y} r={b.r} fill={b.color} initial={{ opacity: 0.75 }}
              animate={animated ? { cx: [b.x, b.x + (rng(seed, b.idx + 30) - 0.5) * 40, b.x], cy: [b.y, b.y + (rng(seed, b.idx + 40) - 0.5) * 40, b.y], scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 6 + b.idx * 1.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }} />
          ))}
        </g>
        <circle cx="50" cy="45" r="35" fill={`url(#nb-center-${uid})`} />
      </svg>
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 2. COSMIC DUST — Stardust Particle Cloud
// ═══════════════════════════════════════════════════════════════════

const CosmicDustAvatar: React.FC<{ seed: string; size: number; colors: string[]; animated?: boolean }> = ({
  seed, size, colors, animated,
}) => {
  const uid = useId();
  const particles = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      x: rng(seed, i) * 100, y: rng(seed, i + 100) * 100,
      r: 0.3 + rng(seed, i + 200) * 2.5, color: pick(colors, seed, i + 300),
      opacity: 0.3 + rng(seed, i + 400) * 0.7, idx: i,
    })), [seed, colors]);

  const nebulae = useMemo(() =>
    Array.from({ length: 3 }).map((_, i) => ({
      cx: 20 + rng(seed, i + 500) * 60, cy: 20 + rng(seed, i + 600) * 60,
      r: 20 + rng(seed, i + 700) * 25, color: colors[i % colors.length], idx: i,
    })), [seed, colors]);

  return (
    <div style={{ width: size, height: size, background: '#050510' }} className="relative overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <filter id={`cd-glow-${uid}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {nebulae.map((n) => (
            <radialGradient key={n.idx} id={`cd-neb-${uid}-${n.idx}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        {nebulae.map((n) => (
          <motion.circle key={`neb-${n.idx}`} cx={n.cx} cy={n.cy} r={n.r} fill={`url(#cd-neb-${uid}-${n.idx})`}
            animate={animated ? { r: [n.r, n.r * 1.2, n.r], opacity: [0.6, 0.9, 0.6] } : {}}
            transition={{ duration: 8 + n.idx * 2, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        <g filter={`url(#cd-glow-${uid})`}>
          {particles.map((p) => (
            <motion.circle key={p.idx} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.opacity}
              animate={animated ? { opacity: [p.opacity, p.opacity * 0.3, p.opacity] } : {}}
              transition={{ duration: 2 + rng(seed, p.idx + 800) * 4, repeat: Infinity, ease: 'easeInOut', delay: rng(seed, p.idx + 900) * 3 }} />
          ))}
        </g>
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 3. LIQUID METAL — Chrome Mercury Sphere
// ═══════════════════════════════════════════════════════════════════

const LiquidMetalAvatar: React.FC<{ seed: string; size: number; colors: string[]; animated?: boolean }> = ({
  seed, size, colors, animated,
}) => {
  const uid = useId();
  const highlights = useMemo(() =>
    Array.from({ length: 4 }).map((_, i) => ({
      x: 25 + rng(seed, i + 50) * 50, y: 20 + rng(seed, i + 60) * 40,
      r: 8 + rng(seed, i + 70) * 15, idx: i,
    })), [seed]);

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <radialGradient id={`lm-bg-${uid}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={colors[1] || '#c0c0c0'} />
            <stop offset="50%" stopColor={colors[0]} />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          <radialGradient id={`lm-hl-${uid}`} cx="35%" cy="30%" r="40%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="50%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id={`lm-distort-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed={Math.floor(rng(seed, 0) * 999)} />
            <feDisplacementMap in="SourceGraphic" scale="8" />
          </filter>
          <linearGradient id={`lm-edge-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[2] || colors[0]} stopOpacity="0.6" />
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor={colors[1] || colors[0]} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#lm-bg-${uid})`} />
        <circle cx="50" cy="50" r="44" fill={`url(#lm-edge-${uid})`} filter={`url(#lm-distort-${uid})`} opacity="0.5" />
        {highlights.map((h) => (
          <motion.ellipse key={h.idx} cx={h.x} cy={h.y} rx={h.r} ry={h.r * 0.6} fill="white" opacity={0.15 + rng(seed, h.idx + 80) * 0.2}
            animate={animated ? { cx: [h.x, h.x + 5, h.x], cy: [h.y, h.y - 3, h.y], opacity: [0.15, 0.3, 0.15] } : {}}
            transition={{ duration: 5 + h.idx, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        <circle cx="38" cy="35" r="18" fill={`url(#lm-hl-${uid})`} />
        <ellipse cx="55" cy="72" rx="15" ry="5" fill="white" opacity="0.06" />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 4. CRYSTAL FACET — Low-Poly Gem
// ═══════════════════════════════════════════════════════════════════

const CrystalFacetAvatar: React.FC<{ seed: string; size: number; colors: string[] }> = ({ seed, size, colors }) => {
  const facets = useMemo(() => {
    const items: { points: string; color: string; opacity: number }[] = [];
    const pts = Array.from({ length: 12 }).map((_, i) => ({
      x: rng(seed, i + 1000) * 100, y: rng(seed, i + 2000) * 100,
    }));
    pts.push({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 0, y: 50 }, { x: 100, y: 50 });
    const cx = 50, cy = 50;
    const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    for (let i = 0; i < sorted.length; i++) {
      const p1 = sorted[i]; const p2 = sorted[(i + 1) % sorted.length];
      items.push({ points: `${cx},${cy} ${p1.x},${p1.y} ${p2.x},${p2.y}`, color: pick(colors, seed, i + 3000), opacity: 0.7 + rng(seed, i + 4000) * 0.3 });
    }
    return items;
  }, [seed, colors]);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" fill={colors[0]} />
      {facets.map((f, i) => (
        <polygon key={i} points={f.points} fill={f.color} fillOpacity={f.opacity} stroke={f.color} strokeWidth="0.3" strokeOpacity="0.3" />
      ))}
      <defs>
        <linearGradient id="crystal-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" /><stop offset="50%" stopColor="transparent" /><stop offset="100%" stopColor="white" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#crystal-shine)" opacity="0.15" style={{ mixBlendMode: 'overlay' }} />
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 5. NEON PULSE — Pulsing Neon Ring
// ═══════════════════════════════════════════════════════════════════

const NeonPulseAvatar: React.FC<{ seed: string; size: number; colors: string[]; animated?: boolean }> = ({
  seed, size, colors, animated,
}) => {
  const uid = useId();
  const ringCount = 3 + Math.floor(rng(seed, 0) * 3);
  const rings = useMemo(() =>
    Array.from({ length: ringCount }).map((_, i) => ({
      r: 15 + i * (30 / ringCount), color: colors[i % colors.length],
      width: 1.5 + rng(seed, i + 100) * 2,
      dashArray: `${5 + rng(seed, i + 200) * 20} ${3 + rng(seed, i + 300) * 10}`, idx: i,
    })), [seed, colors, ringCount]);

  const initials = seed.slice(0, 2).toUpperCase();

  return (
    <div style={{ width: size, height: size, background: '#0a0a15' }} className="relative overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          {rings.map((ring) => (
            <filter key={ring.idx} id={`np-glow-${uid}-${ring.idx}`}>
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>
        {rings.map((ring) => (
          <motion.circle key={ring.idx} cx="50" cy="50" r={ring.r} fill="none" stroke={ring.color}
            strokeWidth={ring.width} strokeDasharray={ring.dashArray} strokeLinecap="round"
            filter={`url(#np-glow-${uid}-${ring.idx})`}
            animate={animated ? { strokeDashoffset: [0, 100], rotate: [0, ring.idx % 2 === 0 ? 360 : -360] } : {}}
            transition={{ duration: 10 + ring.idx * 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50px 50px' }} />
        ))}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={colors[0]} fontSize="20" fontWeight="bold"
          fontFamily="system-ui, sans-serif" filter={`url(#np-glow-${uid}-0)`}>{initials}</text>
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 6. HOLOGRAPHIC — Iridescent Hologram Card
// ═══════════════════════════════════════════════════════════════════

const HolographicAvatar: React.FC<{ seed: string; size: number; colors: string[]; animated?: boolean }> = ({
  seed, size, colors, animated,
}) => {
  const uid = useId();
  const layers = useMemo(() =>
    Array.from({ length: 5 }).map((_, i) => ({
      angle: rng(seed, i + 500) * 360, color1: colors[i % colors.length],
      color2: colors[(i + 1) % colors.length], idx: i,
    })), [seed, colors]);

  return (
    <div style={{ width: size, height: size }} className="relative overflow-hidden bg-gray-900">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          {layers.map((l) => (
            <linearGradient key={l.idx} id={`holo-${uid}-${l.idx}`} gradientTransform={`rotate(${l.angle})`}>
              <stop offset="0%" stopColor={l.color1} stopOpacity="0.4" />
              <stop offset="50%" stopColor={l.color2} stopOpacity="0.2" />
              <stop offset="100%" stopColor={l.color1} stopOpacity="0.4" />
            </linearGradient>
          ))}
          <linearGradient id={`rainbow-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="20%" stopColor="#ff0000" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#ffff00" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#00ff00" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#0000ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <pattern id={`holo-lines-${uid}`} width="100" height="2" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="0" stroke="white" strokeWidth="0.5" opacity="0.05" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={colors[0]} opacity="0.3" />
        {layers.map((l) => (
          <motion.rect key={l.idx} width="100" height="100" fill={`url(#holo-${uid}-${l.idx})`} style={{ mixBlendMode: 'screen' }}
            animate={animated ? { opacity: [0.3, 0.7, 0.3], x: [0, rng(seed, l.idx + 600) * 10 - 5, 0] } : {}}
            transition={{ duration: 4 + l.idx * 1.5, repeat: Infinity, ease: 'easeInOut', delay: l.idx * 0.5 }} />
        ))}
        <motion.rect x="-20" y="0" width="30" height="100" fill={`url(#rainbow-${uid})`} opacity="0.25" style={{ mixBlendMode: 'overlay' }}
          animate={animated ? { x: [-20, 120] } : {}} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }} />
        <rect width="100" height="100" fill={`url(#holo-lines-${uid})`} />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 7. ORIGAMI — Paper-Fold Geometric
// ═══════════════════════════════════════════════════════════════════

const OrigamiAvatar: React.FC<{ seed: string; size: number; colors: string[] }> = ({ seed, size, colors }) => {
  const shapes = useMemo(() => {
    const items: { points: string; color: string; opacity: number }[] = [];
    const gs = 4, cw = 100 / gs, ch = 100 / gs;
    for (let row = 0; row < gs; row++) {
      for (let col = 0; col < gs; col++) {
        const x = col * cw, y = row * ch, idx = row * gs + col;
        const color = pick(colors, seed, idx + 5000);
        const v = Math.floor(rng(seed, idx + 6000) * 4);
        const tl = `${x},${y}`, tr = `${x + cw},${y}`, br = `${x + cw},${y + ch}`, bl = `${x},${y + ch}`;
        if (v === 0) { items.push({ points: `${tl} ${tr} ${bl}`, color, opacity: 0.85 }); items.push({ points: `${tr} ${br} ${bl}`, color, opacity: 0.65 }); }
        else if (v === 1) { items.push({ points: `${tl} ${tr} ${br}`, color, opacity: 0.75 }); items.push({ points: `${tl} ${br} ${bl}`, color, opacity: 0.9 }); }
        else if (v === 2) { items.push({ points: `${tl} ${tr} ${br} ${bl}`, color, opacity: 0.8 }); }
        else { const mx = x + cw / 2, my = y + ch / 2; items.push({ points: `${mx},${y} ${x + cw},${my} ${mx},${y + ch} ${x},${my}`, color, opacity: 0.75 }); }
      }
    }
    return items;
  }, [seed, colors]);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#f5f0e8" />
      {shapes.map((s, i) => (
        <polygon key={i} points={s.points} fill={s.color} fillOpacity={s.opacity} stroke="#f5f0e8" strokeWidth="0.5" />
      ))}
      <rect width="100" height="100" fill="white" opacity="0.05" style={{ mixBlendMode: 'overlay' }} />
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 8. PHOTO BOOTH (Preserved from v3.0)
// ═══════════════════════════════════════════════════════════════════

const PhotoAvatar: React.FC<{ imageUrl: string; size: number; filter: PhotoFilter; colors: string[] }> = ({ imageUrl, size, filter, colors }) => {
  const uniqueId = useId();
  const c1 = hexToRgb(colors[0]);
  const c2 = hexToRgb(colors[1] || '#ffffff');

  return (
    <div style={{ width: size, height: size }} className="relative overflow-hidden bg-black">
      {filter === 'duotone' && (
        <svg width="0" height="0">
          <filter id={`duotone-${uniqueId}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={`${c1.r} ${c2.r}`} />
              <feFuncG type="table" tableValues={`${c1.g} ${c2.g}`} />
              <feFuncB type="table" tableValues={`${c1.b} ${c2.b}`} />
            </feComponentTransfer>
          </filter>
        </svg>
      )}
      <div className={`relative w-full h-full ${filter === 'pixelate' ? 'pixelated-image' : ''}`}>
        {filter === 'glitch' ? (
          <>
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-75" style={{ transform: 'translateX(-2px)', filter: 'hue-rotate(90deg)' }} />
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover" />
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-75" style={{ transform: 'translateX(2px)', filter: 'hue-rotate(-90deg)' }} />
          </>
        ) : filter === 'prism' ? (
          <>
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" style={{ transform: 'scale(1.1) rotate(5deg)' }} />
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" style={{ transform: 'scale(1.1) rotate(-5deg)', filter: 'hue-rotate(180deg)' }} />
            <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" />
          </>
        ) : (
          <img src={imageUrl} className="w-full h-full object-cover"
            style={filter === 'duotone' ? { filter: `url(#duotone-${uniqueId})` } : filter === 'pixelate' ? { imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] } : {}} />
        )}
        {(filter === 'glitch' || filter === 'pixelate') && (
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
        )}
      </div>
      <style>{`.pixelated-image img { image-rendering: pixelated; transform: scale(0.125) scale(8); transform-origin: top left; width: 800% !important; height: 800% !important; } .pixelated-image { overflow: hidden; }`}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({
  seed, style = 'nanoBanana', size = 80, colors: customColors,
  imageUrl, filter = 'none', animated = true, className = '',
  onClick, ring = false, ringColor,
}) => {
  const colors = getPalette(seed, customColors);
  const resolved = resolveStyle(style);

  const content = useMemo(() => {
    if (resolved === 'photo' && imageUrl) {
      return <PhotoAvatar imageUrl={imageUrl} size={size} filter={filter} colors={colors} />;
    }
    switch (resolved) {
      case 'nanoBanana': return <NanoBananaAvatar seed={seed} size={size} colors={colors} animated={animated} />;
      case 'cosmicDust': return <CosmicDustAvatar seed={seed} size={size} colors={colors} animated={animated} />;
      case 'liquidMetal': return <LiquidMetalAvatar seed={seed} size={size} colors={colors} animated={animated} />;
      case 'crystalFacet': return <CrystalFacetAvatar seed={seed} size={size} colors={colors} />;
      case 'neonPulse': return <NeonPulseAvatar seed={seed} size={size} colors={colors} animated={animated} />;
      case 'holographic': return <HolographicAvatar seed={seed} size={size} colors={colors} animated={animated} />;
      case 'origami': return <OrigamiAvatar seed={seed} size={size} colors={colors} />;
      default: return <NanoBananaAvatar seed={seed} size={size} colors={colors} animated={animated} />;
    }
  }, [resolved, seed, size, colors, animated, imageUrl, filter]);

  return (
    <div className={`relative rounded-full overflow-hidden shadow-sm select-none ${className} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
      style={{ width: size, height: size }} onClick={onClick}>
      {ring && <div className="absolute inset-0 rounded-full border-2 border-white/20 z-10 pointer-events-none" style={{ borderColor: ringColor }} />}
      {content}
    </div>
  );
};

export default AvatarGenerator;
