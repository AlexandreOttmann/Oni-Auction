# Design Spec: Login Screen

**Route:** `/login`
**Output file:** `frontend/react-app/src/pages/LoginPage.tsx`
**Design tokens:** `.claude/design-specs/design-tokens.ts`
**On success:** Redirect to `/dashboard` (admin) or `/` (buyer — future routing)
**On load (already authed):** Redirect to `/dashboard` immediately

---

## 1. Purpose & Tone

The login screen is the threshold — the moment a procurement manager enters the trading floor. It should feel like opening a door, not filling out a form.

**Design intent:** The form is minimal. The rest of the screen is the brand. Use the left/right split to give the form space to breathe and the brand room to make a statement.

---

## 2. Layout

**Desktop (≥ 1024px) — 40/60 split**

```
┌──────────────────────┬──────────────────────────────────────┐
│                      │                                      │
│   FORM PANEL         │   BRAND PANEL                        │
│   (40%, dark)        │   (60%, darker + animated)           │
│                      │                                      │
│   ◆ ONI              │   [Live auction activity             │
│                      │    visualization — D3]               │
│   Welcome back.      │                                      │
│                      │   "14 auctions running now."         │
│   Email              │   ● Active bidders: 47               │
│   [____________]     │   ● Bids in last hour: 312           │
│                      │                                      │
│   Password           │   [Scrolling bid activity feed]      │
│   [____________]     │                                      │
│                      │                                      │
│   [  Sign In  ]      │                                      │
│                      │                                      │
│   Forgot password?   │                                      │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

**Mobile (< 1024px) — Single column, form only**

Brand panel hidden on mobile. Form centered vertically, max-width 380px, `px-6`.

---

## 3. Component Specs

---

### 3.1 FormPanel (left, 40%)

**Background:** `color.bg.surface` (`#18181B`)
**Border right:** 1px `color.border.default` (`#27272A`)

#### Logo
```
◆ ONI
```
- Same as navbar. Diamond in `color.accent.DEFAULT`, "ONI" in white, weight 700.
- Positioned top-left: `pt-8 pl-10`
- Animation: On mount, diamond fades in and rotates 0→45° (spring, 500ms). Once only.

#### Headline
```
Welcome back.
```
- `1.75rem`, weight 700, `text.primary`
- Positioned `mt-16` below logo (generous breathing room)
- Subtitle: `"Sign in to your workspace."` — `body`, `text.secondary`, `mt-1`
- Animation: `variants.slideUp`, 150ms delay after logo.

#### Email Input

```
Email address
┌─────────────────────────────┐
│  you@company.com            │
└─────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Label | `label` typography, `text.secondary`, `mb-1.5` |
| Input bg | `color.bg.elevated` (`#27272A`) |
| Input border | 1px `color.border.default` |
| Input border (focus) | 2px `color.border.accent` (orange-600), no outline |
| Input text | `text.primary`, 14px |
| Height | 44px |
| Radius | `radius.sm` (4px) |
| Padding | `px-4` |
| Type | `email`, `autocomplete="email"` |
| Error state | Border `color.border.winning` (red), error text below in `text.losing`, 12px |

#### Password Input

Same styling as email. Append a toggle icon (eye / eye-slash) inside the input, right side. Icon `text.tertiary`, becomes `text.secondary` on hover.

#### Sign In Button

```
┌─────────────────────────────────┐
│           Sign In               │
└─────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Width | Full width (`w-full`) |
| Height | 48px |
| Background | `color.accent.DEFAULT` (orange-500) |
| Text | `color.text.inverse` (`#09090B`), weight 700, 15px |
| Radius | `radius.md` (8px) |
| Hover | `bg-orange-400`, `scale(1.01)` spring |
| Active | `scale(0.99)` |
| Disabled (loading) | `bg-orange-500/50`, spinner centered (20px, white) |
| Focus ring | `ring-2 ring-orange-500 ring-offset-2 ring-offset-bg-surface` |
| `mt` | `mt-6` — generous gap from last input |

**Loading state behavior:**
- On submit: button disables, shows spinner, label disappears.
- Do NOT disable the entire form — let user cancel by pressing Escape.

#### Error Banner (auth failure)

Appears **above the button**, below the password field. Slides down with `variants.slideUp`.

```
┌─────────────────────────────────┐
│  ✕  Invalid email or password.  │
└─────────────────────────────────┘
```

- `bg-red-950`, `border border-red-900`, `radius.sm`
- `text-red-400`, 13px
- `px-4 py-3`
- Auto-clears when user starts typing again

#### "Forgot password?" link

- `caption` (12px), `text.tertiary`
- Centered below the button, `mt-4`
- Hover: `text.secondary`
- Out of scope for MVP implementation (shows "Contact your admin" on click)

#### Bottom note

```
New to Oni?  Request access →
```
- `caption`, `text.tertiary`, centered, `mt-10`
- "Request access" in `color.accent.DEFAULT`, hover underline

---

### 3.2 BrandPanel (right, 60%)

**Background:** `color.bg.base` (`#09090B`) with the same grid dot texture as the homepage hero.

**Purpose:** Make waiting for credentials feel intentional. Show the product is alive right now.

**Content — vertically centered, `px-12`:**

#### Live stats header

```
  14 auctions running right now.
```
- `1.5rem`, weight 700, `text.primary`
- The number `14` has a counter animation on mount (counts up from 0 in 800ms, `motion.gentle` spring). **This is mock data** — no API call required on the login page.

Below the headline, two inline stats:
```
  ● 47 active bidders     ● 312 bids this hour
```
- Green dot (bid.winning) + text, `body`, `text.secondary`
- Each stat fades in with stagger (150ms apart)

#### D3 Activity Visualization

A **heatmap-style grid** showing mock auction bid frequency — columns = auctions, rows = time slots (last 20 minutes in 1-min buckets). Cell color intensity maps to bid count in that minute.

```
  Past 20 minutes ────────────────
  Auction A  ░░▒▒▓▓████▒▒▒▒░░▒▒▓▓░░
  Auction B  ░░░░▒▒▒▒▓▓██▓▓▒▒░░░░▒▒
  Auction C  ▓▓████████████▓▓▒▒░░░░░
  Auction D  ░░░░░░▒▒▒▒▒▒▓▓▓▓██████
             └──────────────────────▶ now
```

| Property | Value |
|----------|-------|
| Cell size | 20×20px with 3px gap |
| Color scale | `interpolateOranges` D3 scale, remapped to palette: `#431407` (low) → `#F97316` (high) |
| Empty cells | `color.bg.elevated` |
| Animation on mount | Cells reveal left→right, each column with 30ms delay. Fill color transitions from bg to data color over 400ms. |
| Tooltip on hover | Shows "Auction: Coil 304 · 14:30 · 8 bids" — `bg.elevated`, `radius.sm`, `shadow.md` |
| Axes | Minimal: just "now" label at right edge, "20 min ago" at left, `caption`, `text.tertiary` |

#### Live Bid Activity Feed

Below the heatmap — a slim auto-scrolling feed of mock bid events.

```
  $14,200  Coil 304          just now
  $9,800   Titanium Sheet    2s ago
  $6,100   Aluminum Extrusion 5s ago
  $14,100  Coil 304          8s ago
```

| Property | Value |
|----------|-------|
| New entry | Slides in from top (`variants.bidEntry`), others shift down |
| Item layout | Amount (bold, tabular, `text.accent` orange) · lot name (`text.secondary`) · timestamp (`text.tertiary`, right-aligned) |
| Frequency | New mock entry every 3–6s (random interval) |
| Max visible | 5 entries. 6th+ slides out bottom. |
| Data | Hardcoded mock lot names + randomized amounts within plausible ranges |

---

## 4. Keyboard & Accessibility

| Behavior | Spec |
|----------|------|
| Tab order | Email → Password → Sign In → Forgot password |
| Enter submits | While any field is focused |
| `aria-label` on password toggle | "Show password" / "Hide password" |
| Error announced | `role="alert"` on error banner — screen reader announces immediately |
| Autofocus | Email field on mount (`autoFocus`) |
| Loading state | Button `aria-busy="true"`, `aria-label="Signing in..."` during submit |

---

## 5. Animation Timeline

```
t=0ms    Form panel fades in (opacity 0→1, 200ms)
t=100ms  Logo diamond rotates in
t=200ms  "Welcome back." slides up
t=300ms  Inputs fade in (stagger 80ms each)
t=460ms  Sign In button fades in
t=550ms  Forgot password link fades in

[Brand panel — independent timeline]
t=0ms    Grid dot bg renders
t=200ms  Headline fades in, counter starts
t=400ms  Stats fade in (stagger)
t=600ms  Heatmap cells reveal (left→right wave, ~600ms total)
t=1200ms First mock bid entry slides in
t=[random 3–6s interval] Subsequent bid entries
```

---

## 6. File Map

```
frontend/react-app/src/
├── pages/
│   └── LoginPage.tsx              ← page shell, layout split
├── components/login/
│   ├── LoginForm.tsx              ← form, validation, submit handler
│   ├── LoginBrandPanel.tsx        ← right panel with stats + D3
│   ├── ActivityHeatmap.tsx        ← D3 heatmap (mock data)
│   └── LiveBidFeed.tsx            ← auto-scrolling mock bid entries
└── hooks/
    └── useAuth.ts                 ← login mutation, redirect logic
```

---

## 7. State: useAuth Hook

```typescript
interface AuthState {
  user: { id: string; name: string; email: string; role: 'ADMIN' | 'BUYER' | 'SELLER' } | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}
```

- On `login()` success: store user in Zustand + localStorage token, push to `/dashboard`
- On `login()` error: set `error` string, displayed in error banner
- On mount: if token exists in localStorage, verify with `/api/me` — redirect if valid

---

## 8. Anti-patterns

- No CAPTCHA on login in MVP (internal tool — add only if abuse becomes a concern)
- No "Remember me" checkbox — sessions persist via token with reasonable TTL
- No social OAuth buttons — not in scope
- The brand panel is decoration — failure to load it should never block form interaction (load independently)
- No skeleton loader on the brand panel — if D3 hasn't loaded, show the headline + stats only; heatmap appears when ready
