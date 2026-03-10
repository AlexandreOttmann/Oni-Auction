/**
 * Oni Auction Platform — Design Tokens
 * Single source of truth for all UI constants.
 *
 * Aesthetic: "Obsidian Terminal" — dark procurement trading floor.
 * Quirky but professional. Gamified density. Not SaaS blue.
 * Accent palette: orange (urgency) + violet (gamified) on near-black.
 * All screens default to dark mode. Homepage uses a light hero inversion.
 *
 * Motion: motion.dev (Framer Motion v11+). D3 for dataviz.
 * Future: canvas-based auction interfaces — tokens must work in canvas ctx too.
 */

// ─────────────────────────────────────────────────────────────
// COLOR
// ─────────────────────────────────────────────────────────────

export const color = {
  // Base surfaces — zinc-based near-black with slight warmth
  bg: {
    base:      '#09090B', // zinc-950 — page background
    surface:   '#18181B', // zinc-900 — cards, panels
    elevated:  '#27272A', // zinc-800 — modals, dropdowns
    overlay:   'rgba(9,9,11,0.80)', // scrim behind modals
    subtle:    '#3F3F46', // zinc-700 — dividers, inactive tabs
  },

  // Primary accent: amber-orange — urgency, energy, bids
  accent: {
    DEFAULT:  '#F97316', // orange-500
    dim:      '#7C3404', // orange-950 — subtle tints on dark
    bright:   '#FB923C', // orange-400 — hover states
    muted:    '#431407', // orange-950/70 — very subtle bg tint
    contrast: '#FFF7ED', // orange-50  — text on accent bg
  },

  // Secondary: violet — gamification, leader badge, rank, "special"
  violet: {
    DEFAULT:  '#A78BFA', // violet-400
    dim:      '#4C1D95', // violet-900
    muted:    '#2E1065', // violet-950
    bright:   '#C4B5FD', // violet-300
  },

  // Semantic bid state
  bid: {
    winning:   '#4ADE80', // green-400
    losing:    '#F87171', // red-400
    neutral:   '#71717A', // zinc-500
    closing:   '#FBBF24', // amber-400
    won:       '#86EFAC', // green-300 (softer, outcome state)
  },

  // Text
  text: {
    primary:   '#FAFAFA', // zinc-50
    secondary: '#A1A1AA', // zinc-400
    tertiary:  '#71717A', // zinc-500
    inverse:   '#09090B', // on light backgrounds
    accent:    '#F97316', // orange text on dark
    violet:    '#A78BFA',
    winning:   '#4ADE80',
    losing:    '#F87171',
    closing:   '#FBBF24',
  },

  // Status system (auction lifecycle)
  status: {
    active:    { bg: '#14532D', text: '#4ADE80', dot: '#4ADE80' },    // green
    closing:   { bg: '#451A03', text: '#FBBF24', dot: '#FBBF24' },    // amber, pulse
    scheduled: { bg: '#1E1B4B', text: '#A78BFA', dot: '#A78BFA' },    // violet
    closed:    { bg: '#27272A', text: '#71717A', dot: '#52525B' },     // zinc
    draft:     { bg: '#18181B', text: '#52525B', dot: '#3F3F46' },     // muted
  },

  // Homepage (light section) — inverted for public landing
  light: {
    bg:        '#FAFAF8', // warm white
    surface:   '#F4F4F0', // warm gray
    text:      '#18181B',
    secondary: '#71717A',
  },

  // Borders
  border: {
    default:  '#27272A', // zinc-800
    strong:   '#3F3F46', // zinc-700
    accent:   '#EA580C', // orange-600 — focus rings, active tabs
    violet:   '#7C3AED', // violet-600
    winning:  '#16A34A', // green-600
  },
} as const


// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────

export const typography = {
  // Font stacks
  sans:  "'Inter Variable', 'Inter', system-ui, sans-serif",
  mono:  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",

  // Procurement users scan — tabular figures on all numbers
  hero_price: {
    // Auction price hero, 48px+
    size:    'clamp(2.5rem, 5vw, 4rem)',
    weight:  '800',
    font:    "'Inter Variable'",
    features: "'tnum' on, 'ss01' on",
    lineHeight: '1',
  },
  bid_price: {
    // Bid history / live tickers
    size:    '1.5rem',
    weight:  '700',
    features: "'tnum' on",
  },
  countdown: {
    size:    '1.75rem',
    weight:  '800',
    font:    "'JetBrains Mono'",  // monospace for timer — mechanical feel
    features: "'tnum' on",
  },
  stat_value: {
    // Dashboard KPI numbers
    size:    '2rem',
    weight:  '700',
    features: "'tnum' on",
  },
  label: {
    // "CURRENT BID", section labels
    size:          '0.625rem',
    weight:        '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    font:          "'Inter Variable'",
  },
  body: {
    size:       '0.875rem',
    weight:     '400',
    lineHeight: '1.5',
  },
  caption: {
    size:   '0.75rem',
    weight:  '400',
    color:  '#71717A',
  },
  tag: {
    size:   '0.6875rem',
    weight:  '600',
    letterSpacing: '0.04em',
  },
} as const


// ─────────────────────────────────────────────────────────────
// SPACING  (4px grid)
// ─────────────────────────────────────────────────────────────

export const spacing = {
  px:  '1px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const


// ─────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────

export const radius = {
  xs:   '2px',   // tight — data tags, mono chips
  sm:   '4px',   // inputs, inline tags
  md:   '8px',   // cards, panels
  lg:   '12px',  // modals, drawers
  xl:   '16px',  // large cards
  full: '9999px', // pills, avatar rings
} as const

export const shadow = {
  // Dark-mode shadows use colored glows instead of grey
  sm:     '0 1px 3px rgba(0,0,0,0.4)',
  md:     '0 4px 12px rgba(0,0,0,0.5)',
  lg:     '0 8px 32px rgba(0,0,0,0.6)',
  accent: '0 0 24px rgba(249,115,22,0.25)',  // orange glow on hover cards
  violet: '0 0 24px rgba(167,139,250,0.20)', // violet glow on leader badge
  winning:'0 0 16px rgba(74,222,128,0.30)',  // green glow when user is winning
} as const


// ─────────────────────────────────────────────────────────────
// MOTION  (motion.dev / Framer Motion)
// ─────────────────────────────────────────────────────────────

export const motion = {
  // Easing presets — use these, never cubic-bezier inline
  ease: {
    out:    [0.0, 0.0, 0.2, 1.0],   // decelerate — entering elements
    in:     [0.4, 0.0, 1.0, 1.0],   // accelerate — leaving elements
    inOut:  [0.4, 0.0, 0.2, 1.0],   // full — value transitions
    spring: { type: 'spring', stiffness: 400, damping: 30 }, // snappy, physical
    gentle: { type: 'spring', stiffness: 200, damping: 28 }, // number counting
  },

  // Duration constants (seconds)
  duration: {
    instant: 0.08,
    fast:    0.15,
    normal:  0.25,
    slow:    0.40,
    crawl:   0.60,
  },

  // Named animation variants — import and spread in motion components
  variants: {
    fadeIn: {
      hidden:  { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] } },
    },
    slideUp: {
      hidden:  { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.30, ease: [0.0, 0.0, 0.2, 1.0] } },
    },
    slideInRight: {
      hidden:  { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    },
    bidEntry: {
      // New bid appearing in history list
      hidden:  { opacity: 0, y: -8, scale: 0.98 },
      visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] } },
    },
    priceFlash: {
      // Price update: flash accent color then fade
      animate: { backgroundColor: ['rgba(249,115,22,0.15)', 'rgba(249,115,22,0)'], transition: { duration: 0.6 } },
    },
    outbidFlash: {
      animate: { backgroundColor: ['rgba(248,113,113,0.15)', 'rgba(248,113,113,0)'], transition: { duration: 0.5 } },
    },
    staggerContainer: {
      visible: { transition: { staggerChildren: 0.06 } },
    },
    scaleIn: {
      hidden:  { opacity: 0, scale: 0.92 },
      visible: { opacity: 1, scale: 1,    transition: { duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] } },
    },
  },

  // Urgency pulses (CSS animation on timer)
  pulse: {
    closing: 'pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    critical:'pulse 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
} as const


// ─────────────────────────────────────────────────────────────
// Z-INDEX
// ─────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  above:   10,
  sticky:  20,
  overlay: 30,
  modal:   40,
  toast:   50,
} as const


// ─────────────────────────────────────────────────────────────
// GAMIFICATION ELEMENTS
// ─────────────────────────────────────────────────────────────

export const gamification = {
  // Auction "heat" intensity — drives visual urgency
  heat: {
    cold:   { color: '#71717A', label: 'Quiet' },
    warm:   { color: '#F97316', label: 'Active' },
    hot:    { color: '#EF4444', label: 'Hot' },
    frenzy: { color: '#DC2626', label: 'Frenzy', glow: '0 0 20px rgba(220,38,38,0.5)' },
  },
  // Bid rank badge — shown on buyer's bid history, admin monitor
  rank: {
    leader:   { bg: '#A78BFA', text: '#09090B', label: 'Leader' },
    runner_up:{ bg: '#F97316', text: '#09090B', label: '2nd' },
    other:    { bg: '#27272A', text: '#A1A1AA', label: '' },
  },
} as const


// ─────────────────────────────────────────────────────────────
// TAILWIND CONFIG MAPPING
// ─────────────────────────────────────────────────────────────
// Add to tailwind.config.ts → theme.extend:
//
// colors:
//   bg: color.bg
//   accent: color.accent
//   oni-violet: color.violet
//   bid: color.bid
//
// fontFamily:
//   sans: typography.sans
//   mono: typography.mono
//
// boxShadow:
//   accent: shadow.accent
//   violet: shadow.violet
//   winning: shadow.winning


// ─────────────────────────────────────────────────────────────
// EXPORTED BUNDLE
// ─────────────────────────────────────────────────────────────

export const tokens = { color, typography, spacing, radius, shadow, motion, zIndex, gamification } as const

export type BidStatus   = 'winning' | 'losing' | 'neutral' | 'closed_won' | 'closed_lost'
export type HeatLevel   = 'cold' | 'warm' | 'hot' | 'frenzy'
export type AuctionType = 'ENGLISH' | 'DUTCH'
export type AuctionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED' | 'SETTLED'
