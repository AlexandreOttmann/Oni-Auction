---
name: "react-native-dev"
description: "React Native mobile development for the auction platform iOS and Android app. Shares business logic, types, and API client with the React web app via a shared package. Use when building mobile screens, handling native gestures, managing push notifications for outbid alerts, implementing React Native WebSocket connections, or configuring Expo."
---

# React Native Developer

Mobile app development for the auction platform, targeting iOS and Android. Shares the same backend as the web app.

---

## Project Structure (Monorepo)

```
auction-realtime/
├── apps/
│   ├── web/          ← React web app
│   └── mobile/       ← React Native (Expo) app
├── packages/
│   ├── shared/       ← Shared: types, API client, validation schemas, utils
│   └── ui-primitives/← Shared design tokens (colors, spacing, typography)
└── package.json      ← Workspace root
```

The `packages/shared` package is the key — it prevents duplicating business logic.

---

## Tech Stack

- **Expo SDK** (managed workflow) — faster iteration, OTA updates
- **React Native** with TypeScript (strict)
- **NativeWind** for styling (Tailwind classes in React Native)
- **Zustand** for state (same store shape as web where possible)
- **TanStack Query** for server state (same queries as web)
- **Expo Router** for navigation (file-based, mirrors web routes)
- **Expo Notifications** for push (outbid alerts, auction starting soon)

---

## Shared Package Usage

```typescript
// packages/shared/src/types.ts — used by BOTH web and mobile
export interface Bid {
  id: string
  lotId: string
  userId: string
  amount: number
  placedAt: string
}

export interface Lot {
  id: string
  title: string
  currentBid: number
  currentBidderId: string | null
  endsAt: string
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
}
```

```typescript
// packages/shared/src/api.ts — same API client, same endpoints
export const api = {
  placeBid: (lotId: string, amount: number) =>
    fetch(`${API_BASE}/api/v1/auctions/${lotId}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount }),
    }).then(r => r.json()),
}
```

---

## Navigation (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   ├── _layout.tsx         ← Tab navigator
│   ├── index.tsx           ← Active auctions list
│   ├── auction/
│   │   └── [id].tsx        ← Auction detail + live bidding
│   ├── history.tsx         ← My bid history
│   └── profile.tsx
```

---

## Real-time (WebSocket on Mobile)

```typescript
// hooks/useAuctionSocket.ts — same logic as web, but handles app backgrounding
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useAuctionStore } from 'shared'

export const useAuctionSocket = (lotId: string) => {
  const ws = useRef<WebSocket | null>(null)
  const addBid = useAuctionStore((s) => s.addBid)

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(`${WS_URL}/lots/${lotId}`)
      ws.current.onmessage = (e) => {
        const event = JSON.parse(e.data)
        if (event.type === 'BID_PLACED') addBid(event.payload)
      }
      ws.current.onclose = () => {
        // Auto-reconnect after 2s if app is foreground
        if (AppState.currentState === 'active') {
          setTimeout(connect, 2000)
        }
      }
    }

    connect()

    // Reconnect when app comes back to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
        connect()
      }
      if (state === 'background') {
        ws.current?.close()
      }
    })

    return () => {
      ws.current?.close()
      sub.remove()
    }
  }, [lotId])
}
```

---

## Push Notifications (Outbid Alerts)

```typescript
// Register on login
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications(userId: string) {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  const token = (await Notifications.getExpoPushTokenAsync()).data

  // Send token to backend — backend stores it and uses it to push outbid events
  await api.registerPushToken(userId, token)
}
```

**Backend sends push when a user is outbid:**
```typescript
// server: on BID_PLACED event, check if previous high bidder is outbid
// → send Expo push notification to their stored token
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: previousBidderToken,
    title: "You've been outbid",
    body: `Current bid on "${lot.title}" is now $${newAmount}`,
    data: { lotId, screen: 'auction' },
  }),
})
```

---

## Mobile UX Constraints

- **Bid CTA always at bottom** — reachable with thumb
- **Large touch targets** — minimum 44pt
- **Haptic feedback** on bid confirm: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
- **Optimistic updates** — show bid immediately, reconcile with server event
- **Offline state** — show banner, disable bid input, queue reconnect

---

## Gestures

```typescript
// Swipe left on lot card → quick bid (place bid at minimum increment)
import { Swipeable } from 'react-native-gesture-handler'

<Swipeable
  renderRightActions={() => <QuickBidAction lotId={lot.id} />}
  friction={2}
>
  <LotCard lot={lot} />
</Swipeable>
```

---

## Common Commands

```bash
npx expo start             # Start dev server
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
npx expo build             # Production build (EAS)
npx expo publish           # OTA update
```
