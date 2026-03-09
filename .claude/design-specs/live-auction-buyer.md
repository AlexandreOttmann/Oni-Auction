# Design Spec: Live Auction — Buyer View

**Route:** `/auction/:auction_id`
**Output file:** `frontend/react-app/src/pages/LiveAuction.tsx`
**Design tokens:** `.claude/design-specs/design-tokens.ts`
**Last updated:** 2026-03-09

---

## 1. User & Job-to-be-Done

**Who:** Procurement manager / buyer participating in a live auction.

**What they need right now:**
- See the current price instantly, without hunting for it
- Know if they are winning or losing at a glance
- Place or adjust a bid with minimal friction
- Feel the time pressure — urgency drives decisions

**What creates anxiety:**
- Being outbid in the last second (English — sniping)
- Hesitating too long on the right price and losing (Dutch)
- Submitting a bid and not knowing if it landed
- UI layout shifting during live updates (breaks focus)

**What must be prevented:**
- Accidental double-bid submission
- Submitting below the minimum valid amount
- Missing a price change because the user wasn't looking

---

## 2. User Flows

### English Auction Flow

```
[Page load]
  → WS connects → receives AUCTION_STATE snapshot
  → Hero panel renders: Current Bid, Time Remaining, status
  → Bid history populates

[Placing a bid]
  → User reviews Current Bid
  → Clicks amount input → sees suggested next bid (currentBid + minIncrement)
  → Types or accepts suggested amount
  → Clicks "Place Bid"
  → CTA disables (prevents double-submit), spinner appears
  → WS receives BID_ACCEPTED → status flips to "You're Winning" (green)
  → OR WS receives BID_REJECTED → inline error shown, input re-enables

[Being outbid (while on page)]
  → WS receives BID_ACCEPTED from another user
  → Price jumps (animated tick)
  → Status badge flips to "You've Been Outbid" (red)
  → "Re-Bid" CTA appears with new suggested minimum
  → Toast: "You've been outbid — new minimum: $X" (dismisses in 5s)

[Closing phase — <60s]
  → Timer turns red, pulse animation starts
  → "CLOSING SOON" badge appears beside timer
  → Bid CTA stays enabled (last chance)
  → Anti-snipe: if bid placed <30s remaining, timer extends — server sends updated ends_at

[Auction closes]
  → WS receives AUCTION_CLOSED
  → Winner banner (green if user won, neutral if another buyer won)
  → Bid input area replaced by outcome panel
  → No layout shift — outcome panel occupies same space
```

### Dutch Auction Flow

```
[Page load]
  → WS connects → receives AUCTION_STATE (current_price, round, ends_at)
  → Hero shows: Current Price (large), Round N, time until price drops

[Waiting for right price]
  → Each DUTCH_ROUND message updates price (animated count-down)
  → Round timer counts down to next drop
  → User sees price floor indicator: "Floor: $X — auction ends without winner below this"

[Striking]
  → User decides current price is acceptable
  → Single large CTA: "Strike at $[current_price]"
  → No input needed — bid amount = current price
  → Click → CTA disables immediately (race condition prevention)
  → WS receives BID_ACCEPTED → "You Won!" winner panel
  → OR WS receives BID_REJECTED (someone else struck first within same ms)
     → "Auction Sold — another buyer struck first" message

[Price floor reached without bid]
  → WS receives AUCTION_CLOSED with winner: null
  → "No Winner — auction closed at floor price" message
```

---

## 3. Page Layout

### Desktop (≥ 1024px) — Two-column

```
┌─────────────────────────────────────────────────────┐
│  [Lot title]                    [ACTIVE] [ENGLISH]  │  ← header bar, sticky
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│   HERO PANEL (left)      │   BID ACTION (right)     │
│   Current Bid: $4,200    │   Your Bid               │
│   ████████████████████   │   [    $4,400          ] │
│   Time Remaining: 4:32   │   Min: $4,300 (+$100)    │
│   ● 7 bidders            │   [    Place Bid    →  ] │
│                          │                          │
│   Status: You're Winning │   ─────────────────────  │
│   ✓ Your bid: $4,200     │   Bid History            │
│                          │   $4,200 · You · 14:31   │
├──────────────────────────│   $4,100 · Bidder 4      │
│   Lot Details            │   $4,000 · Bidder 2      │
│   (collapsible)          │   $3,800 · Bidder 7      │
└──────────────────────────┴──────────────────────────┘
```

### Mobile (< 1024px) — Single column, bid action pinned to bottom

```
┌────────────────────────┐
│ [←] Lot title  [LIVE] │  ← compact header
├────────────────────────┤
│                        │
│  Current Bid           │
│  $4,200                │  ← 48px, bold, green if winning
│                        │
│  Time Remaining        │
│  4:32                  │  ← 24px tabular-nums
│                        │
│  You're Winning ✓      │  ← status badge
│                        │
│  Bid History           │
│  $4,200 · You · 14:31  │
│  $4,100 · Bidder 4     │
│  $4,000 · Bidder 2     │
│  [show more]           │
│                        │
│  Lot Details ▸         │  ← collapsible
│                        │
│                        │  ← scroll area ends
├────────────────────────┤
│  [    $4,400         ] │  ← sticky bid panel
│  Min: $4,300 (+$100)   │
│  [    Place Bid  →   ] │  ← full-width CTA, 52px tall
└────────────────────────┘
```

---

## 4. Component Specs

---

### 4.1 AuctionHeader

**Location:** Top of page, sticky on scroll.

| Element | Spec |
|---------|------|
| Lot title | `text.primary`, `body` weight 600, truncated with ellipsis |
| Auction type badge | Pill: `ENGLISH` (blue-100/blue-700) or `DUTCH` (amber-100/amber-700). radius=full |
| Status badge | `ACTIVE` (green), `CLOSING` (amber + pulse), `CLOSED` (gray). See tokens.color.status |
| Height | 56px desktop, 48px mobile |
| Background | `surface.base` with `border.default` bottom |

---

### 4.2 HeroPricePanel

The most important element on the page. Drives all attention.

**English variant:**

| Element | Spec |
|---------|------|
| Label | "Current Bid" — `label` typography, `text.secondary` |
| Amount | `bid_price_hero` (48px, 800 weight, tabular-nums). Color: `bid.winning` if user is leader, `text.primary` if not |
| Price change animation | On WS update: number counts up over 150ms (CSS counter or framer-motion). One-time, not looping |
| Outbid flash | 300ms red background flash on panel when user is outbid — `bg-red-50` fading back to white |

**Dutch variant:**

| Element | Spec |
|---------|------|
| Label | "Current Price" — `label` typography, `text.secondary` |
| Amount | Same size as English, but color always `text.primary` (neutral until user strikes) |
| Round indicator | "Round 3" — `body` typography, `text.secondary`, bottom of price block |
| Price drop animation | Number counts DOWN over 300ms on DUTCH_ROUND message |
| Next drop in | Compact timer: "Next drop in 0:22" — `caption`, `text.tertiary` |
| Price floor | "Floor: $800" — `caption`, `text.tertiary`. Dimmed indicator, not alarming |

---

### 4.3 CountdownTimer

**States:**

| Time left | Color | Animation | Label |
|-----------|-------|-----------|-------|
| > 5 min | `text.secondary` | None | "5:23" |
| 1–5 min | `text.closing` (amber) | None | "4:11" |
| < 60s | `text.losing` (red) | `criticalPulse` on the timer | "0:47" |
| CLOSING | `text.losing` (red) | `criticalPulse` | "0:12 · CLOSING" |
| CLOSED | `text.tertiary` | None | "Closed" |

**Layout:**
- Label: "Time Remaining" (`label` typography, above timer)
- Timer value: `countdown` typography (24px, 700 weight, tabular-nums)
- Do NOT add a circular progress ring — it creates layout shift risk and adds no precision
- On mobile: timer sits directly below the price, same column

---

### 4.4 BidderCount

Small, honest social proof. Not a vanity metric.

```
● 7 bidders watching
```

- Green dot: `bid.winning` color — indicates live activity
- Text: `caption`, `text.secondary`
- Dot pulses once on count change (not continuously)
- On zero bidders: hide entirely (don't show "0 bidders")

---

### 4.5 UserStatusBadge

Shows the user's current position in the auction. Highest-priority feedback element.

**States:**

| State | Text | Color | Icon |
|-------|------|-------|------|
| `winning` | "You're Winning" | `bid.winning` bg-green-50 | ✓ checkmark |
| `losing` | "You've Been Outbid" | `bid.losing` bg-red-50 | ✗ x-mark |
| `neutral` | _(hidden — user hasn't bid)_ | — | — |
| `closed_won` | "You Won" | `bid.winning` bg-green-50, border | trophy icon |
| `closed_lost` | "Auction Ended" | `text.secondary` bg-gray-50 | — |

**Transition:** `statusFade` (150ms fade-in) on state change. No slide animations — layout must not shift.

**Position:** Below the price on mobile. Below Time Remaining on desktop left panel.

---

### 4.6 BidInputPanel (English only)

**States:**

#### idle
```
Your Bid
┌──────────────────────────┐
│  $  4,400.00             │  ← right-aligned, tabular-nums
└──────────────────────────┘
  Min: $4,300 · Suggested: $4,400
┌──────────────────────────┐
│        Place Bid  →      │  ← bg: gray-900, text: white
└──────────────────────────┘
```

#### editing (input focused)
- Border: `border.focus` (blue-600), 2px
- Increment guide shows inline: "+$100 above current" in caption below
- Input: right-aligned, 24px, tabular-nums
- Real-time validation: red border + "Must be at least $4,300" if below min

#### submitting
- CTA: disabled, spinner (20px) centered, text hidden
- Input: disabled (no pointer events)
- Optimistic update: UserStatusBadge flips to "winning" immediately (reverts on rejection)

#### rejected
- Toast appears: "Bid rejected — [reason from server]"
- Input re-enables with value preserved
- No modal — rejection is not catastrophic, just informative

**CTA Spec:**
- Height: 52px (mobile-friendly touch target)
- Font: 15px, weight 600
- Background: `surface.overlay` (gray-900) — intentionally dark/heavy
- Hover: no animation — bid actions must feel instant and decisive
- Disabled: `bg-gray-300`, `text-gray-500`, `cursor-not-allowed`
- Radius: `radius.md` (8px)

**Input Spec:**
- Type: `number`, step matching minIncrement
- Placeholder: formatted current minimum ("4,300.00")
- `inputmode="decimal"` for mobile numeric keyboard
- Prefix: "$" label inside input, left-padded, `text.secondary`
- Radius: `radius.sm` (4px)
- Border: 1px `border.default`, focus 2px `border.focus`

---

### 4.7 DutchStrikePanel (Dutch only)

No input needed. The decision is when, not how much.

```
Current Price
$1,400.00

You'll lock in this price immediately.
No other buyer can take it once confirmed.

┌──────────────────────────────────┐
│     Strike at $1,400.00   ⚡     │  ← full-width, dark bg
└──────────────────────────────────┘

Floor: $800 · Round 4 of ~8
```

**CTA Spec:**
- Same dimensions as BidInputPanel CTA (52px height)
- On click: immediately show "Confirming..." and disable — race condition window is <1s
- The lightning icon (⚡) reinforces speed imperative — Dutch = first mover wins
- If BID_REJECTED received (someone else struck first): replace CTA with "Sold — another buyer struck at $1,400" message in amber

**Price update on DUTCH_ROUND:**
- Panel reloads new price with countdown animation (150ms)
- CTA label updates: "Strike at $1,300.00"
- Brief amber flash on price area to signal the drop

---

### 4.8 BidHistory

Scrollable list, newest first. Anonymizes other buyers.

**Item format:**
```
$4,200    You             14:31:04
$4,100    Bidder 4        14:30:47
$4,000    Bidder 2        14:29:11
$3,800    Bidder 7        14:28:55
```

| Element | Spec |
|---------|------|
| Amount | `bid_price` typography (28px), `text.primary`. User's own bids: `bid.winning` or `bid.losing` color |
| Bidder label | `body`, `text.secondary`. "You" for own bids (bold). Others: "Bidder N" (anonymized ordinal) |
| Timestamp | `caption`, `text.tertiary`, right-aligned |
| User's own bid row | `bg-green-50` (winning) or `bg-red-50` (outbid) — subtle tint, no border |
| New bid animation | Slides in from top (translateY -8px → 0, 150ms ease-out). Single run. |
| Overflow | `max-h-[320px]` on desktop, `max-h-[240px]` on mobile. `overflow-y-auto`. Custom slim scrollbar. |
| Empty state | "No bids yet — be the first." (`body`, `text.tertiary`, centered) |
| "Show more" | If history > 10 items on mobile: "Show all N bids" link — expands in place |

**Do NOT paginate bid history on this page.** Redis caps at 100 bids; load all in the initial WS state snapshot.

---

### 4.9 LotDetails (collapsible)

Below the fold. Procurement managers care about specs, not marketing copy.

```
▸ Lot Details

  Material:    Stainless Steel Coil (304 grade)
  Quantity:    50 MT
  Delivery:    Ex-Works, Rotterdam
  Seller:      Acme Steel BV
  Starting:    $3,500
```

| Element | Spec |
|---------|------|
| Toggle | Chevron rotates 90°. Click anywhere on header row. |
| Content | Simple `dl`/`dt`/`dd` grid, 2-column. `body` typography. |
| No images in MVP | Lot image placeholder reserved but not required |
| Collapsed by default | Open on desktop if there's vertical space; collapsed on mobile |

---

### 4.10 OutcomePanel (replaces bid input area after close)

**Winner (user won):**
```
┌──────────────────────────────────────┐
│  ✓  You Won                          │
│     Final Price: $4,200              │
│     Lot: Stainless Steel Coil        │
│     The seller will contact you shortly.│
└──────────────────────────────────────┘
```
- Background: `bg-green-50`, border `border-green-200`
- Icon: checkmark in `bid.winning` green

**Loser (another buyer won):**
```
┌──────────────────────────────────────┐
│  Auction Ended                       │
│  Final Price: $4,200                 │
│  Your highest bid: $3,900            │
└──────────────────────────────────────┘
```
- Background: `surface.elevated`, border `border.default`
- Neutral tone — no red "loser" imagery; procurement managers will return

**No winner (Dutch floor reached):**
```
┌──────────────────────────────────────┐
│  Auction Closed — No Winner          │
│  Price reached floor ($800) without  │
│  a buyer striking.                   │
└──────────────────────────────────────┘
```

---

## 5. WebSocket Event → UI Mapping

| WS Message | Component updated | Behavior |
|------------|-------------------|----------|
| `AUCTION_STATE` (on connect) | All | Initial render, full hydration |
| `BID_ACCEPTED` | HeroPricePanel, UserStatusBadge, BidHistory | Price animates up; badge updates; history prepends |
| `BID_REJECTED` | BidInputPanel | Toast with reason; input re-enables |
| `AUCTION_CLOSING` | CountdownTimer, AuctionHeader | Timer goes red + pulse; header badge = CLOSING |
| `AUCTION_CLOSED` | Entire bid area | OutcomePanel replaces BidInputPanel/DutchStrikePanel |
| `DUTCH_ROUND` | HeroPricePanel, DutchStrikePanel | Price counts down; CTA updates; amber flash |

**Reconnection behavior:**
- On disconnect: show persistent "Reconnecting..." banner (amber, top of page, below header)
- On reconnect: WS sends fresh `AUCTION_STATE` — full re-hydration, no manual refresh needed
- Stale state: if last update > 10s ago and WS appears connected, show subtle "Live updates paused" indicator

---

## 6. Responsive Breakpoints

| Breakpoint | Layout | Bid action location |
|------------|--------|---------------------|
| < 640px (mobile) | Single column | Sticky bottom panel |
| 640–1023px (tablet) | Single column | Sticky bottom panel |
| ≥ 1024px (desktop) | Two column (60/40 split) | Right column, top-aligned, sticky within column |

**Layout shift rules:**
- Bid history items insert at top — existing items shift DOWN only (never horizontal)
- Timer updates in-place (no size change)
- Status badge height is fixed (reserve space even when hidden — use `visibility: hidden` not `display: none`)

---

## 7. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Price updates | `aria-live="polite"` on HeroPricePanel — screen reader announces new price |
| Outbid alert | `aria-live="assertive"` on UserStatusBadge when state = "losing" |
| Bid input label | `"Your bid (minimum $X)"` — includes minimum amount |
| Timer | `aria-label="Time remaining: 4 minutes 32 seconds"` — full text, not "4:32" |
| CTA disabled state | `aria-disabled="true"` + `disabled` attribute, `cursor-not-allowed` |
| Countdown urgency | When < 60s: `aria-label` updates every 10s to announce time |
| Focus management | On BID_ACCEPTED: focus moves to UserStatusBadge (confirmation) |
| Keyboard bid flow | Tab: input → CTA. Enter on CTA submits. Escape clears input. |

---

## 8. Tailwind Class Reference

Key classes for implementation. Use tokens for semantic meaning.

```tsx
// Current Bid hero — winning state
<span className="text-5xl font-extrabold tabular-nums text-green-600 leading-none">
  $4,200
</span>

// Status badge — winning
<div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
  <CheckIcon className="h-4 w-4" /> You're Winning
</div>

// Status badge — losing
<div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
  <XMarkIcon className="h-4 w-4" /> You've Been Outbid
</div>

// Place Bid CTA — active
<button className="w-full h-13 rounded-md bg-gray-900 text-white text-[15px] font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
  Place Bid →
</button>

// Strike CTA — Dutch
<button className="w-full h-13 rounded-md bg-gray-900 text-white text-[15px] font-semibold ...">
  Strike at $1,400.00 ⚡
</button>

// Timer — critical state
<span className="text-2xl font-bold tabular-nums text-red-600 animate-pulse">
  0:47
</span>

// Bid history item — own bid
<div className="flex items-baseline gap-3 px-3 py-2 rounded bg-green-50">
  <span className="text-xl font-bold tabular-nums text-green-700">$4,200</span>
  <span className="text-sm font-medium text-gray-900">You</span>
  <span className="ml-auto text-xs text-gray-400">14:31:04</span>
</div>

// Bid history item — other bidder
<div className="flex items-baseline gap-3 px-3 py-2 rounded">
  <span className="text-xl font-bold tabular-nums text-gray-900">$4,100</span>
  <span className="text-sm text-gray-500">Bidder 4</span>
  <span className="ml-auto text-xs text-gray-400">14:30:47</span>
</div>

// Reconnecting banner
<div className="sticky top-14 z-20 w-full bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-2">
  Reconnecting to live auction…
</div>
```

---

## 9. Component File Map

```
frontend/react-app/src/
├── pages/
│   └── LiveAuction.tsx              ← page shell, layout, WS hook
├── components/auction/
│   ├── AuctionHeader.tsx            ← lot title, type + status badges
│   ├── HeroPricePanel.tsx           ← current bid/price (English/Dutch)
│   ├── CountdownTimer.tsx           ← time remaining with urgency states
│   ├── BidderCount.tsx              ← live bidder count
│   ├── UserStatusBadge.tsx          ← winning/losing/neutral
│   ├── BidInputPanel.tsx            ← English: amount input + CTA
│   ├── DutchStrikePanel.tsx         ← Dutch: strike CTA
│   ├── BidHistory.tsx               ← scrollable bid list
│   ├── LotDetails.tsx               ← collapsible lot info
│   └── OutcomePanel.tsx             ← post-close winner/loser/no-winner
├── hooks/
│   └── useAuctionWebSocket.ts       ← WS connection, reconnect, message dispatch
└── stores/
    └── auctionStore.ts              ← Zustand store: auction state, user bid status
```

---

## 10. State Management (Zustand store shape)

```typescript
interface AuctionStore {
  // Live auction state (from WS)
  auctionId:     string | null
  title:         string
  auctionType:   'ENGLISH' | 'DUTCH'
  status:        'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
  currentPrice:  number   // English: highest_bid; Dutch: current_price
  leader:        string | null
  endsAt:        string   // ISO timestamp
  bidHistory:    BidEntry[]
  bidderCount:   number
  currentRound?: number   // Dutch only
  priceFloor?:   number   // Dutch only

  // User's perspective
  userId:        string
  userBidStatus: 'winning' | 'losing' | 'neutral' | 'closed_won' | 'closed_lost'
  userLastBid:   number | null

  // WebSocket connection
  wsStatus:      'connecting' | 'connected' | 'reconnecting' | 'disconnected'

  // Actions
  handleWsMessage: (msg: WsMessage) => void
  placeBid:        (amount: number) => Promise<void>
}
```

---

## 11. What the Frontend Agent Must NOT Do

- Do not show the real user ID / email of other bidders — anonymize as "Bidder N"
- Do not animate the bid CTA on hover — feels hesitant; buyers need confidence
- Do not add a modal confirmation before bid submit — one-click is intentional; the input + visible minimum is enough friction
- Do not collapse or hide the Current Bid during loading — use a skeleton loader in-place
- Do not add a "refresh" button anywhere — WS reconnect handles this automatically
- Do not use toast for every state change — only for: outbid alert, bid rejected, WS disconnected

---

## 12. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Confirm modal before bid? | No — minimum amount guide + visible current price is sufficient friction |
| Show bid amounts of others in full? | Yes — English auction transparency is a feature |
| Show winner's identity to others? | No — announce "Auction Ended" with final price, winner identity is private |
| Anti-snipe extension: show new end time? | Yes — update CountdownTimer when ends_at changes via AUCTION_CLOSING |
| Sound effects on outbid? | Out of scope for MVP — noted for Phase 3 |
