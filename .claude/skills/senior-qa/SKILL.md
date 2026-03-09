---
name: "senior-qa"
description: "Generates unit tests, integration tests, E2E tests, and load tests for the auction platform. Scans components to create Vitest + React Testing Library test stubs, analyzes coverage reports to surface gaps, scaffolds Playwright tests, mocks API/WebSocket calls with MSW, and sets up load scenarios. Use when asked to generate tests, write unit tests, analyze test coverage, scaffold E2E tests, configure Vitest, implement testing patterns, or improve test quality."
---

# Senior QA Engineer

Test automation, coverage analysis, and quality assurance for the real-time auction platform.

---

## Test Pyramid for This Project

```
        E2E (Playwright)
       ─────────────────
      Integration (Supertest)
     ──────────────────────────
    Unit (Vitest + RTL)
   ──────────────────────────────
  Load/Stress (k6 or Artillery)
 ──────────────────────────────────
```

---

## Unit & Component Tests (Vitest + RTL)

### Component test structure

```typescript
// __tests__/BidCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BidCard } from '../components/BidCard'

describe('BidCard', () => {
  it('displays bid amount and bidder', () => {
    render(<BidCard amount={1500} bidder="Acme Corp" isWinning={false} />)
    expect(screen.getByText('$1,500')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('highlights winning bid', () => {
    render(<BidCard amount={1500} bidder="Acme Corp" isWinning={true} />)
    expect(screen.getByRole('article')).toHaveClass('border-green-500')
  })
})
```

### WebSocket hook test

```typescript
// __tests__/useAuctionSocket.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuctionSocket } from '../hooks/useAuctionSocket'
import WS from 'jest-websocket-mock'

describe('useAuctionSocket', () => {
  let server: WS

  beforeEach(() => { server = new WS('ws://localhost:3001/lots/lot-1') })
  afterEach(() => WS.clean())

  it('adds bid to store on BID_PLACED event', async () => {
    const { result } = renderHook(() => useAuctionSocket('lot-1'))
    await server.connected
    act(() => {
      server.send(JSON.stringify({ type: 'BID_PLACED', payload: { amount: 2000, bidder: 'x' } }))
    })
    // assert store updated
  })
})
```

---

## API Integration Tests (Supertest)

```typescript
// __tests__/api/bids.test.ts
import request from 'supertest'
import { app } from '../../src/app'
import { db } from '../../src/db'

describe('POST /api/v1/auctions/:id/bids', () => {
  it('returns 201 with valid bid', async () => {
    const res = await request(app)
      .post('/api/v1/auctions/lot-1/bids')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ amount: 1500 })

    expect(res.status).toBe(201)
    expect(res.body.data.amount).toBe(1500)
  })

  it('returns 409 when bid is lower than current', async () => {
    const res = await request(app)
      .post('/api/v1/auctions/lot-1/bids')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ amount: 100 })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('BID_TOO_LOW')
  })

  it('returns 429 when rate limit exceeded', async () => {
    // Send 11 bids in rapid succession
    const results = await Promise.all(
      Array.from({ length: 11 }, () =>
        request(app).post('/api/v1/auctions/lot-1/bids')
          .set('Authorization', `Bearer ${testToken}`)
          .send({ amount: 1500 + Math.random() })
      )
    )
    expect(results.some(r => r.status === 429)).toBe(true)
  })
})
```

---

## E2E Tests (Playwright)

```typescript
// e2e/auction-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Live Auction', () => {
  test('buyer can place a bid and see it reflected in realtime', async ({ page, context }) => {
    await page.goto('/auctions/active-auction-id')
    const initialBid = await page.getByTestId('current-bid').textContent()

    await page.getByRole('button', { name: 'Place Bid' }).click()
    await page.getByLabel('Bid Amount').fill('2500')
    await page.getByRole('button', { name: 'Confirm Bid' }).click()

    // Should update in real-time without page refresh
    await expect(page.getByTestId('current-bid')).toContainText('2,500')
  })

  test('two simultaneous bidders — only highest bid wins', async ({ browser }) => {
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const page1 = await ctx1.newPage()
    const page2 = await ctx2.newPage()

    await Promise.all([
      page1.goto('/auctions/lot-1'),
      page2.goto('/auctions/lot-1'),
    ])

    // Both bid simultaneously
    await Promise.all([
      page1.getByLabel('Bid Amount').fill('3000'),
      page2.getByLabel('Bid Amount').fill('3100'),
    ])
    await Promise.all([
      page1.getByRole('button', { name: 'Confirm Bid' }).click(),
      page2.getByRole('button', { name: 'Confirm Bid' }).click(),
    ])

    // Both pages should show 3100 as current bid
    await expect(page1.getByTestId('current-bid')).toContainText('3,100')
    await expect(page2.getByTestId('current-bid')).toContainText('3,100')
  })
})
```

---

## MSW — API Mocking for Component Tests

```typescript
// __tests__/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/v1/auctions/:id', (req, res, ctx) =>
    res(ctx.json({ data: { id: req.params.id, currentBid: 1000, status: 'ACTIVE' } }))
  ),
  rest.post('/api/v1/auctions/:id/bids', (req, res, ctx) =>
    res(ctx.status(201), ctx.json({ data: { amount: 1500 } }))
  ),
]
```

---

## Coverage Thresholds (vitest.config.ts)

```typescript
coverage: {
  thresholds: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  exclude: ['**/*.stories.tsx', '**/mocks/**'],
}
```

---

## Common Commands

```bash
npx vitest                    # Run unit/integration tests (watch)
npx vitest run --coverage     # Run once with coverage report
npx playwright test           # Run E2E tests
npx playwright test --ui      # Playwright UI mode (debug)
npx playwright codegen        # Record new test interactions
```
