# Design Spec: Homepage

**Route:** `/`
**Output file:** `frontend/react-app/src/pages/HomePage.tsx`
**Design tokens:** `.claude/design-specs/design-tokens.ts`
**Auth redirect:** If logged in → `/dashboard`. If not → stay on page, CTA opens `/login`.

---

## 1. Purpose & Tone

The homepage is the only public-facing page. It sets the brand identity before any user has credentials.

**Audience:** Procurement heads, supply chain managers evaluating the platform. They're skeptical, time-poor, and allergic to marketing fluff.

**Goal:** Communicate *what Oni is* and *why it matters* in under 10 seconds. Drive the "Request Access" or "Sign In" action.

**Tone:** Confident, slightly cryptic, premium. Not "Streamline your procurement workflow today!" — more like "The auction room, rebuilt." Minimal copy. Let the product speak through the live visualization.

---

## 2. Layout Sections

```
┌────────────────────────────────────────────────────────────┐
│  NAV BAR                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  HERO — dark section, full viewport height                 │
│  Live bid ticker background animation                      │
│  Headline + sub + CTA                                      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  FEATURE STRIP — 3 columns, light bg                      │
│  English · Dutch · Real-time                               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LIVE PREVIEW PANEL — dark again                          │
│  Animated mock auction card (D3 bid chart)                 │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  FOOTER — minimal, dark                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specs

---

### 3.1 NavBar

**Height:** 60px. Sticky. Starts transparent, transitions to `bg.surface/90 + backdrop-blur-md` on scroll.

```
┌─────────────────────────────────────────────────────┐
│  ◆ ONI                              Sign In  →       │
└─────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Logo mark | "◆ ONI" — diamond glyph (◆ unicode U+25C6) in `color.accent.DEFAULT` (orange), "ONI" in `text.primary` white, weight 700, tracking tight |
| Logo animation | On mount: diamond rotates 0→45° in 600ms (spring). On hover: rotates another 45°. |
| "Sign In →" | `body` 14px, `text.secondary`, weight 500. Arrow shifts right 4px on hover (motion, 150ms). Clicking goes to `/login` |
| No other nav items | MVP — no marketing links, no hamburger. Just brand + auth action. |
| Transparent → frosted | `motion.animate` on scroll: `backgroundColor` from `rgba(9,9,11,0)` to `rgba(24,24,27,0.9)`, blur 12px. Triggered at 40px scroll. |

---

### 3.2 Hero Section

**Background:** `color.bg.base` (`#09090B`) with a generative **grid dot pattern** overlay — a fine 24px grid of `rgba(255,255,255,0.04)` dots. This echoes the future canvas metaphor and adds texture without busyness.

**Background animation (motion.dev):** A field of floating bid "ticks" — small rectangular chips (`$X,XXX`) in various sizes, scattered across the background at very low opacity (`0.06`–`0.10`). They drift upward slowly, fade in and out. Generated randomly on mount. Gives the impression of an active market without being distracting. Implemented as `motion.div` elements with `animate={{ y: [-20, -80], opacity: [0, 0.08, 0] }}` on infinite loop with staggered delays.

**Content — centered, max-width 680px:**

```
            ◆

   The auction room,
   rebuilt for procurement.

   Real-time English and Dutch auctions
   for supply chain teams. Live bids.
   Instant updates. No refresh needed.

   [  Request Access  ]   Sign In →
```

| Element | Spec |
|---------|------|
| Diamond accent | 32px, `color.accent.DEFAULT`. Pulsing scale: `scale(1) → scale(1.08)` over 2s, infinite, ease-in-out. |
| Headline | `clamp(2.5rem, 6vw, 4.5rem)`, weight 800, `text.primary`. Line 1: normal. Line 2: "rebuilt" — gradient text: `from-orange-400 to-violet-400` via CSS gradient clip. |
| Subline | `1rem`, `text.secondary`, max-width 480px, line-height 1.6 |
| Headline animation | Each word slides up with `variants.slideUp` at 60ms stagger. Initial render only. |
| "Request Access" CTA | Pill button, `bg-orange-500`, `text-[#09090B]`, weight 700, 48px height, `px-8`, `radius.full`. Hover: `bg-orange-400`, scale `1.02` (spring). Focus ring: orange. |
| "Sign In →" secondary | Ghost link, `text.secondary`, weight 500. Arrow translates right on hover. |
| CTA animation | Fade + slide up, 200ms delay after headline. |

**Scroll indicator:** At bottom of viewport, a small animated chevron bouncing downward. Disappears after 20px scroll. `text.tertiary`.

---

### 3.3 Feature Strip

**Background:** `color.light.bg` (`#FAFAF8`) — full inversion from the dark hero. This contrast shift acts as a visual breath.

**Layout:** 3-column grid on desktop, stacked on mobile. Max-width 1100px, centered.

**3 Features:**

---

**Feature 1 — English Auction**
```
  ↑  Ascending Price

  Buyers compete for the best deal.
  Real-time bid updates. Anti-snipe
  protection in the final 30 seconds.
```
- Icon: Upward arrow (Heroicons `ArrowTrendingUpIcon`), 28px, `color.accent.DEFAULT`
- Title: 18px, weight 700, `color.light.text`
- Body: 14px, `color.light.secondary`

**Feature 2 — Dutch Auction**
```
  ↓  Descending Price

  Price drops each round. First buyer
  to strike wins. Speed is the edge.
  No bidding war — just the right moment.
```
- Icon: Downward arrow, same style, `color.violet.DEFAULT`

**Feature 3 — Real-time Engine**
```
  ◎  Live Without Refresh

  Kafka-backed event bus. WebSocket
  delivery to every client. Bid activity
  visible the instant it happens.
```
- Icon: Radio circle (custom or `SignalIcon`), `color.bid.winning` green

**Feature card animation:**
- Each card uses `variants.slideUp` with stagger (0.10s between cards)
- Triggered by `whileInView` with `once: true`, `threshold: 0.3`
- On hover: subtle lift — `y: -4`, shadow increases (`shadow.md`). 200ms spring.

**Dividers between columns:** 1px `color.light.surface` line (not a border — use background gradient)

---

### 3.4 Live Preview Panel

**Background:** Back to dark — `color.bg.base`. Adds visual rhythm (dark → light → dark).

**Left side (text):**
```
  See it in motion.

  Every bid. Every price move.
  Every second of the countdown.
  Your team watches the same room.

  [ Sign In to Explore ]
```
- Headline: 2rem, weight 700, `text.primary`
- Body: `text.secondary`
- CTA: Same style as hero secondary (ghost, orange text)

**Right side (mock auction card — the hero visual):**

An animated mock of an `ACTIVE` English auction. Static data but fully animated.

```
┌─────────────────────────────────────┐
│  ENGLISH · ACTIVE ●                 │
│  Stainless Steel Coil 304 — 50 MT   │
├─────────────────────────────────────┤
│                                     │
│  Current Bid                        │
│  $14,200                   4:32 ●   │
│                                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒ [D3 sparkline] │
│                                     │
├─────────────────────────────────────┤
│  $14,200   Bidder 3   14:31         │
│  $13,900   Bidder 1   14:29         │
│  $13,500   Bidder 6   14:27         │
└─────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Card bg | `color.bg.surface` with `border border-zinc-800`, `radius.lg`, `shadow.lg` |
| Auction type + status badges | Same pill badges as dashboard (see admin-dashboard spec) |
| Current bid | Auto-increments every 5s with a new mock bid. `motion.animate` number tick. |
| Timer | Counts down in real time (from a fixed offset) |
| D3 sparkline | Step-line chart of bid history. Orange line (`color.accent.DEFAULT`), area fill `rgba(249,115,22,0.08)`. 200ms transition on new data point. Axes hidden — pure visual. |
| New bid entry | Each 5s: new bid slides in from top (variants.bidEntry), old bids shift down |
| Card entrance | `scaleIn` on viewport entry, 400ms, once |

**This component is purely cosmetic — no backend needed.** Hardcoded mock data with `setInterval`.

---

### 3.5 Footer

**Height:** 80px. `bg.surface` with `border-t border-zinc-800`.

```
◆ ONI                      © 2026 Oni. All rights reserved.
```

- Logo left, copyright right
- `text.tertiary`, `caption` typography
- No nav links in MVP footer

---

## 4. Page-Level Motion Choreography

The homepage should feel like a single composed entrance, not a series of disconnected fade-ins.

```
t=0ms    NavBar fades in (opacity 0→1, 200ms)
t=100ms  Diamond rotates in
t=200ms  Headline words stagger up (60ms each, ~400ms total)
t=600ms  Subline fades up
t=750ms  CTAs fade + scale in
t=0ms    Bid ticker background starts (independent, looping)

[On scroll to feature strip]
t=0ms    Section fades from light.bg
t=100ms  3 cards stagger in with slideUp

[On scroll to preview panel]
t=0ms    Text content slides in from left
t=200ms  Mock auction card scales in from right
t=600ms  D3 sparkline draws itself (SVG path length animation, 800ms)
```

Use `motion.dev`'s `useInView` hook for scroll-triggered sections. All animations run **once** — no replay on scroll back up.

---

## 5. Mobile Adaptations

| Element | Mobile behavior |
|---------|-----------------|
| Hero headline | `clamp(2rem, 8vw, 3rem)` — tighter |
| Feature strip | Single column, 48px gap between items |
| Live preview | Text above, mock card below. Card width 100%. |
| NavBar | Collapses to logo + "Sign In" only (already minimal — no change) |
| Background ticker | Density reduced by 50% on mobile |

---

## 6. File Map

```
frontend/react-app/src/
├── pages/
│   └── HomePage.tsx              ← page shell, sections
├── components/home/
│   ├── HomeNav.tsx               ← sticky transparent nav
│   ├── HeroSection.tsx           ← headline, CTAs, bg ticker
│   ├── BidTickerBackground.tsx   ← floating bid chips (motion.dev)
│   ├── FeatureStrip.tsx          ← 3-column feature grid
│   ├── LivePreviewPanel.tsx      ← mock auction + D3 sparkline
│   └── HomeFooter.tsx            ← minimal footer
└── components/shared/
    └── AuctionTypeBadge.tsx      ← ENGLISH/DUTCH pill (reused across pages)
```

---

## 7. Anti-patterns

- No hero image or stock photo — the brand is the data
- No "testimonials" section in MVP
- No feature comparison table — three tight paragraphs are enough
- No animated gradient blobs (2023 called)
- No full-page loading spinner — stagger in components individually
- The mock auction card must feel real — use realistic lot names and prices, not "Lorem Item #1"
