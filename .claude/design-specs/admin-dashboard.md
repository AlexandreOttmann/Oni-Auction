# Design Spec: Admin Dashboard — Auction List

**Route:** `/dashboard`
**Output file:** `frontend/react-app/src/pages/AdminDashboard.tsx`
**Guard:** `role === 'ADMIN'` — redirect others to `/`
**Design tokens:** `.claude/design-specs/design-tokens.ts`
**Links to:** `/auction/:auction_id` (existing Buyer view — admin sees same but read-only for now)

---

## 1. Purpose & Tone

The Admin Dashboard is the control tower. An auctioneer monitors all active events, tracks bid velocity, and spots problems before they escalate. This is a **dense information environment** — a good dashboard for a procurement admin reads like a trading terminal, not a marketing page.

**Job-to-be-done:**
- See all auctions and their status at a glance
- Jump into a specific auction to monitor it
- Know immediately which auctions are active, closing soon, or stalled
- Create a new auction

**Design intent:** Data-dense, gamified urgency signals, fast scanning. The grid should feel alive — active auctions pulse, closing auctions scream, closed ones recede. Like a flight operations board.

---

## 2. Layout

**Persistent shell — applies to all admin pages:**

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px, fixed)  │  MAIN CONTENT AREA              │
│                          │                                  │
│  ◆ ONI                   │  [page content]                  │
│                          │                                  │
│  ▸ Dashboard             │                                  │
│    Auctions              │                                  │
│    Lots                  │                                  │
│    Users                 │                                  │
│                          │                                  │
│  ────────────────────    │                                  │
│  [Avatar] Alex Mercer    │                                  │
│           Admin          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

**Mobile (< 1024px):** Sidebar collapses to a bottom tab bar (icon only). Content is full width.

---

## 3. Sidebar

**Background:** `color.bg.surface` (`#18181B`)
**Border right:** 1px `color.border.default`
**Width:** 240px, fixed, full height

| Element | Spec |
|---------|------|
| Logo | ◆ ONI — same as navbar. `pt-6 px-5`. |
| Nav items | 40px tall, `radius.md`, full width. Icon (20px) + label, `px-3 gap-3`. |
| Active state | `bg-zinc-800` bg, `text.primary` text, left border 2px `color.accent.DEFAULT` |
| Inactive state | `text.secondary`, hover `bg-zinc-800/50 text-primary` (150ms) |
| Section label | `label` typography, `text.tertiary`, `px-3 pt-4 pb-1`. e.g. "MANAGE" |
| User block | Bottom of sidebar. Avatar (32px circle, initials, `bg-violet-800`), name + role. |
| Role badge | "Admin" — small pill, `bg-violet-950`, `text-violet-400`, `radius.full`, `tag` typography |

**Nav items for MVP:**
- Dashboard (grid icon) — current page
- Auctions (gavel icon or hammer)
- *(Lots and Users — visible but disabled/dimmed, "Coming soon" tooltip)*

---

## 4. Dashboard Page Content

### 4.1 Header Row

```
  Auction Dashboard          + New Auction
  Monday, 9 March 2026
```

| Element | Spec |
|---------|------|
| Title | `1.5rem`, weight 700, `text.primary` |
| Date | `body`, `text.tertiary`, `mt-0.5` |
| "+ New Auction" CTA | Right-aligned. `bg-orange-500`, `text-[#09090B]`, weight 600, 38px height, `px-5`, `radius.md`. Hover: `bg-orange-400`, scale spring. Plus icon left. |

---

### 4.2 KPI Strip

Four stat cards in a horizontal row. Dense, scannable. Not giant — these are at-a-glance figures, not heroes.

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  ACTIVE     │ │  BIDS TODAY │ │  CLOSING    │ │  SETTLED    │
│  14         │ │  1,247      │ │  3          │ │  8          │
│  auctions   │ │  placed     │ │  soon       │ │  today      │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

| Property | Value |
|----------|-------|
| Card bg | `color.bg.surface` |
| Border | 1px `color.border.default` |
| Radius | `radius.md` |
| Padding | `px-5 py-4` |
| Label | `label` typography, `text.tertiary` — top |
| Number | `stat_value` (2rem, 700 weight, tabular-nums), `text.primary` |
| Sub-label | `caption`, `text.tertiary` — below number |
| "Active" number | `color.bid.winning` (green) |
| "Closing soon" number | `color.bid.closing` (amber) |
| Animation on mount | Numbers count up from 0 over 600ms (`motion.gentle`), staggered 100ms per card |
| Card hover | `y: -2`, `shadow.md` (200ms spring) — subtle lift |

---

### 4.3 Filter Tabs

Inline tab bar between the KPIs and the auction list.

```
  All (25)   Active (14)   Closing (3)   Scheduled (8)   Closed (—)
```

| Property | Value |
|----------|-------|
| Layout | Horizontal, `gap-1` |
| Active tab | `bg-zinc-800`, `text.primary`, weight 600, `radius.sm`, `px-3 py-1.5` |
| Inactive tab | `text.secondary`, hover `text.primary`, `px-3 py-1.5` |
| Count badge | Small number in `text.tertiary` after label (no pill — just space-separated) |
| Switching | Filter applied instantly (client-side), no loading. `motion.animate` layout transition on list |

---

### 4.4 Auction List (Main Grid)

**Layout:** Single column list (not a grid of cards). Each auction = one row. Dense. Procurement managers compare auctions, not browse them — a list enables comparison scanning better than cards.

**Row height:** 72px desktop, 80px mobile.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ● ACTIVE    Stainless Steel Coil 304 — 50 MT    $14,200    4:32   →  │
├────────────────────────────────────────────────────────────────────────┤
│  ◐ CLOSING   Aluminum Extrusion 6061 — 200 KG    $6,800     0:47   →  │  ← amber, pulsing dot
├────────────────────────────────────────────────────────────────────────┤
│  ● ACTIVE    Titanium Sheet Grade 5 — 10 MT      $28,500    12:11  →  │
├────────────────────────────────────────────────────────────────────────┤
│  ○ SCHEDULED Carbon Fiber Roll — 500 M           —          starts in 2h  →  │
├────────────────────────────────────────────────────────────────────────┤
│  ✓ CLOSED    Copper Wire Spool — 1T              $4,100     —       →  │
└────────────────────────────────────────────────────────────────────────┘
```

**Row columns:**

| Column | Width | Content |
|--------|-------|---------|
| Status | 120px | Badge pill + status dot |
| Lot name | flex-1 | Lot title, truncated. Below: auction type badge (ENGLISH / DUTCH, tiny) + bidder count |
| Current Bid | 120px | Right-aligned, tabular, bold. "—" if not started. `text.winning` if active, `text.tertiary` if closed |
| Time | 100px | `CountdownTimer` component (same logic as buyer view). "starts in Xh" if scheduled. "—" if closed |
| Heat indicator | 32px | Auction heat bar — vertical bar colored by `gamification.heat`. Hidden on CLOSED. |
| Arrow | 40px | `→` chevron, `text.tertiary`, `text.primary` on row hover |

**Status badge:**

```typescript
// Status badge pill variants
ACTIVE:    "● ACTIVE"    bg-green-950  text-green-400   dot: animate-pulse (green, slow)
CLOSING:   "◐ CLOSING"  bg-amber-950  text-amber-400   dot: animate-pulse (amber, fast)
SCHEDULED: "○ SCHED."   bg-violet-950 text-violet-400  dot: static
CLOSED:    "✓ CLOSED"   bg-zinc-800   text-zinc-500    dot: none
DRAFT:     "· DRAFT"    bg-zinc-900   text-zinc-600    dot: none
```

**Heat indicator:** A 4px-wide × 32px-tall vertical bar, right of the time column. Color maps to bid velocity (bids per minute):
- 0–1 bpm: `color.gamification.heat.cold` (zinc-500)
- 2–5 bpm: `color.gamification.heat.warm` (orange-500)
- 6–12 bpm: `color.gamification.heat.hot` (red-500)
- 13+ bpm: `color.gamification.heat.frenzy` (red-600 + glow)

The bar **animates height** — fills from bottom to top, height proportional to current heat level. Updates every 30s from polling or WS.

**Row interactions:**

| Interaction | Behavior |
|-------------|----------|
| Hover | Row bg → `bg-zinc-800/50`. Arrow translates right 4px. 150ms. |
| Click anywhere on row | Navigate to `/auction/:auction_id` |
| CLOSING row | Entire row has subtle amber left border (2px) — catches eye immediately |
| New auction appearing (WS) | Row slides in from top, `variants.bidEntry`, existing rows shift down |
| Live bid update (WS) | Current bid number ticks up (`priceFlash` animation). Time updates. Heat bar may change. |

**Row dividers:** 1px `color.border.default` between rows. No card elevation — flat list feel.

---

### 4.5 Empty State

When no auctions match the current filter:

```
        ○

   No auctions here.

   [+ Create your first auction]
```

- Circle icon in `text.tertiary`, 48px
- Text: `body`, `text.tertiary`, centered
- CTA: same as header "+ New Auction" button but secondary style (ghost with border)

---

### 4.6 Live Update Banner

When new data arrives via WebSocket (new auction created, status changed):

```
  ↑ 2 auctions updated — click to refresh view
```

- Appears at top of list, slides down (not a toast — it stays until dismissed or auto-applies)
- `bg-zinc-800`, `text.secondary`, `radius.md`, `px-4 py-2`, centered
- Actually: **auto-applies the update** with list animation. No manual refresh needed. The banner is cosmetic — it appears for 1.5s then the list updates in-place.

---

## 5. WebSocket Events (Dashboard)

| Event | Dashboard effect |
|-------|-----------------|
| `BID_ACCEPTED` | Matching row: current bid ticks up, heat bar may update |
| `AUCTION_CLOSING` | Row status badge changes, amber border appears |
| `AUCTION_CLOSED` | Row status badge changes, timer replaced by "—" |
| New auction (if API) | New row slides in at top of ACTIVE group |

**Polling fallback:** If WS is not yet implemented for dashboard (MVP order), poll `/api/auctions` every 30s. Smooth transition to WS later.

---

## 6. "+ New Auction" Modal (Stub)

Clicking "+ New Auction" opens a modal. **Full design out of scope for this spec** — stub only.

```
┌─────────────────────────────────────────┐
│  Create Auction              ✕           │
├─────────────────────────────────────────┤
│                                         │
│  [Full form — Phase 3 spec]             │
│                                         │
│  [ Cancel ]          [ Create → ]       │
└─────────────────────────────────────────┘
```

- Modal uses `color.bg.elevated`, `radius.lg`, `shadow.lg`
- Backdrop: `color.bg.overlay` (80% opacity)
- For now: just show "Coming in Phase 3" placeholder inside
- Modal entrance: `variants.scaleIn` (scale 0.92→1, fade)

---

## 7. Gamification Details

### Auction Heat Score

Each active auction row carries a **heat score** — a real-time measure of bid velocity. This is a gamification element that makes the dashboard feel like a live ops center.

Heat = bids in last 5 minutes ÷ 5 = bids per minute average.

Visual output:
1. The vertical heat bar (4px wide, right side of row)
2. The status dot pulse speed (ACTIVE: slow pulse at high heat → fast pulse at frenzy)
3. Optional: on "Frenzy" heat, the row gets a very subtle animated gradient border (`border-image` or box-shadow glow, orange)

This data can be derived from the bid history in Redis (count bids in last 5min window) and included in the auction list API response.

### Rank / Position Awareness (future, noted)

In Phase 3, the admin dashboard will show "top bidder" identity per auction. The violet `gamification.rank.leader` badge will appear on the bidder column. Noted here so frontend agent reserves the space.

---

## 8. Page-Level Animation Choreography

```
[Mount]
t=0ms     Sidebar fades in (opacity, 200ms)
t=100ms   Header row slides up
t=200ms   KPI cards stagger in (slideUp, 80ms between cards)
t=440ms   Filter tabs fade in
t=500ms   Auction rows stagger in (slideUp, 40ms between rows, max 8 rows animated)

[Live updates during session]
          Bid update → row flash → number tick (no layout shift)
          Status change → badge transitions (150ms fade between states)
          New row → slides in at correct position in list
```

---

## 9. Responsive (Mobile Admin)

On mobile, the admin dashboard is a simplified list view:

- Sidebar replaced by bottom tab bar (icon only: Dashboard, Auctions)
- KPI strip becomes 2×2 grid
- Auction list rows: simplified to 2 lines
  - Line 1: status badge + lot name
  - Line 2: current bid + timer (right-aligned)
  - Heat bar hidden
- "+ New Auction" button fixed at bottom right (FAB — floating action button, 56px circle, orange)

---

## 10. File Map

```
frontend/react-app/src/
├── pages/
│   └── AdminDashboard.tsx         ← page shell, filter state
├── components/dashboard/
│   ├── AdminSidebar.tsx            ← sidebar nav
│   ├── KpiStrip.tsx                ← 4-stat card row
│   ├── AuctionFilterTabs.tsx       ← All / Active / Closing / etc.
│   ├── AuctionListRow.tsx          ← single auction row
│   ├── AuctionList.tsx             ← list container, motion layout
│   ├── HeatBar.tsx                 ← vertical heat indicator bar
│   └── NewAuctionModal.tsx         ← stub modal (Phase 3 content)
├── hooks/
│   └── useAuctionList.ts           ← TanStack Query + WS updates
└── stores/
    └── dashboardStore.ts           ← Zustand: filter, selected auction
```

---

## 11. useAuctionList Hook

```typescript
interface AuctionListItem {
  auction_id:    string
  title:         string
  auction_type:  'ENGLISH' | 'DUTCH'
  status:        AuctionStatus
  current_bid?:  number   // English: highest_bid / Dutch: current_price
  leader?:       string
  ends_at?:      string
  bidder_count:  number
  bids_per_min:  number   // for heat score
}

// TanStack Query
const { data: auctions } = useQuery({
  queryKey: ['auctions'],
  queryFn:  fetchAuctions,
  refetchInterval: 30_000, // polling fallback until WS
  staleTime: 10_000,
})

// WS patch — when BID_ACCEPTED arrives:
// queryClient.setQueryData(['auctions'], prev =>
//   prev.map(a => a.auction_id === msg.auction_id
//     ? { ...a, current_bid: msg.highest_bid }
//     : a
//   )
// )
```

---

## 12. Anti-patterns

- Do NOT use a card grid for the auction list — lists enable comparison, grids don't
- Do NOT animate every row on every bid — only the affected row flashes
- Do NOT show a full-page loading spinner — use skeleton rows (4 rows of same height, bg-zinc-800 pulsing)
- Do NOT make the heat bar a tooltip-only feature — it must be visible at all times for at-a-glance scanning
- Do NOT label the status dot "live indicator" — it IS the indicator; no separate "live" text needed
- The sidebar width is fixed — do not collapse it on desktop; density is a feature, not a bug
