# Today Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Today Collection page that shows which drivers owe today, who paid, and each driver's deposit or vikup balance.

**Architecture:** Add a pure utility that computes collection rows and totals from existing drivers, cars, and transactions. Render those rows in a new React page and wire it into the current app route/sidebar/header flow. Use the existing transaction modal entry point for quick payment entry.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing app routing and Tailwind classes.

---

### Task 1: Collection Calculation Utility

**Files:**
- Create: `src/features/collections/todayCollection.ts`
- Test: `tests/todayCollection.test.ts`

- [ ] Write failing tests for deposit and vikup rows.
- [ ] Implement `buildTodayCollection(drivers, cars, transactions, date)` with:
  - active/non-deleted drivers only
  - daily expected plan from `getEffectivePlanForDriverDay`
  - paid today from non-deleted regular `INCOME` transactions
  - remaining today as `max(0, expected - paid)`
  - balance label/value from `calcDriverFinance`
  - totals for expected, paid, remaining, unpaid, partial, paid
- [ ] Run `npx vitest run tests/todayCollection.test.ts`.

### Task 2: Today Collection Page

**Files:**
- Create: `src/features/collections/TodayCollectionPage.tsx`
- Test: `tests/TodayCollectionPage.test.tsx`

- [ ] Write a failing render test that expects summary totals, a driver row, balance text, and a quick payment button.
- [ ] Implement the page using `buildTodayCollection`.
- [ ] Quick payment button calls `onAddPayment(driverId)`.
- [ ] Finance history button links to `/drivers/:id`.
- [ ] Run `npx vitest run tests/TodayCollectionPage.test.tsx`.

### Task 3: Route And Navigation

**Files:**
- Modify: `App.tsx`

- [ ] Lazy-load `TodayCollectionPage`.
- [ ] Add `/collections/today` to valid paths.
- [ ] Add sidebar item labeled `Bugungi yig'im`.
- [ ] Add route that passes existing `drivers`, `cars`, `transactions`, `theme`, and payment callback.
- [ ] Payment callback opens the existing transaction modal with `TransactionType.INCOME` and selected driver.
- [ ] Run focused tests and `npm run typecheck`.

### Task 4: Verification

**Files:**
- Existing test files only.

- [ ] Run `npx vitest run tests/todayCollection.test.ts tests/TodayCollectionPage.test.tsx tests/DriverProfilePage.financeSummary.test.tsx tests/serverTelegramNotifications.test.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Start Vite and attempt Browser validation at `/collections/today`.
