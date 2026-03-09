---
name: "playwright-pro"
description: "Production-grade Playwright testing toolkit. Use when the user mentions Playwright tests, end-to-end testing, browser automation, fixing flaky tests, test migration, CI/CD testing, or test suites. Generate tests, fix flaky failures, migrate from Cypress/Selenium, run cross-browser tests, generate reports."
---

# Playwright Pro

Production-grade Playwright testing toolkit for the auction platform.

## Available Commands

| Command | What it does |
|---------|-------------|
| `/pw:init` | Set up Playwright — detects framework, generates config, CI, first smoke test |
| `/pw:generate <spec>` | Generate tests from user story, URL, or component description |
| `/pw:review` | Review tests for anti-patterns and coverage gaps |
| `/pw:fix <test>` | Diagnose and fix failing or flaky tests |
| `/pw:coverage` | Analyze what's tested vs. what's missing |
| `/pw:report` | Generate test report in preferred format |

## Workflow

```
1. /pw:init        → scaffold config, CI pipeline, first smoke test
2. /pw:generate    → generate tests from spec or URL
3. /pw:review      → validate quality, flag anti-patterns  ← always run after generate
4. /pw:fix <test>  → diagnose and repair failing/flaky tests
```

## Core Principles

**Prefer semantic locators:**
```typescript
// ✅ Good
page.getByRole('button', { name: 'Place Bid' })
page.getByLabel('Bid Amount')
page.getByText('Auction Closed')

// ❌ Bad
page.locator('.bid-btn')
page.locator('#bid-input')
page.locator('div > span:nth-child(2)')
```

**Web-first assertions (never hardcoded waits):**
```typescript
// ✅ Good
await expect(page.getByTestId('current-bid')).toHaveText('$2,500')
await expect(page.getByRole('status')).toBeVisible()

// ❌ Bad
await page.waitForTimeout(2000)
```

**Test isolation — each test owns its state:**
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/auctions/test-lot')
  // set up fresh state for this test only
})
```

## Auction-Specific Test Templates

### Real-time Bid Update

```typescript
test('bid appears in real-time across connected clients', async ({ browser }) => {
  const [page1, page2] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
  ])

  await Promise.all([
    page1.goto('/auctions/lot-1'),
    page2.goto('/auctions/lot-1'),
  ])

  // page1 places a bid
  await page1.getByRole('button', { name: 'Place Bid' }).click()
  await page1.getByLabel('Amount').fill('5000')
  await page1.getByRole('button', { name: 'Confirm' }).click()

  // page2 should see the update without refreshing
  await expect(page2.getByTestId('current-bid')).toContainText('5,000', { timeout: 3000 })
})
```

### Auction Countdown

```typescript
test('auction closes when countdown reaches zero', async ({ page }) => {
  // Use a test auction with a 5-second timer
  await page.goto('/auctions/test-closing-lot')
  await expect(page.getByRole('timer')).toBeVisible()
  await expect(page.getByText('Auction Closed')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Place Bid' })).toBeDisabled()
})
```

## CI Integration (GitHub Actions)

```yaml
- name: Run Playwright Tests
  run: npx playwright test
  env:
    CI: true
    BASE_URL: http://localhost:3000

- name: Upload Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

## Anti-Patterns to Flag in Review

- `waitForTimeout` — replace with web-first assertion
- CSS/XPath locators — replace with role/label/text locators
- Shared state between tests — each test must be independent
- Missing `await` on assertions
- Hardcoded URLs — use `process.env.BASE_URL`
- Missing error state tests — always test the failure path

## Common Commands

```bash
npx playwright test                   # Run all tests
npx playwright test --ui              # Visual UI mode
npx playwright test --debug           # Step-through debugger
npx playwright codegen http://localhost:3000  # Record interactions
npx playwright show-report            # Open last HTML report
```
