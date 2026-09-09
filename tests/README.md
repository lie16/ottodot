# Ottodot Test Suites

This directory contains the automated testing suites for the Ottodot Trial Booking backend. The tests are designed to rigorously verify business logic, security invariants, payment handling, and extreme concurrency scenarios.

## Test Execution Commands

```bash
# Run all tests
pnpm run test

# Run all concurrency tests
pnpm run test:concurrency

# Run a specific test suite
npx vitest tests/payment.test.ts
```

---

## Test Files Breakdown

### 1. `concurrency-stampede.test.ts`
Tests raw system performance and inventory management under extreme load.
- **Scenario:** 10 *different* parents try to book the same class that only has 4 seats available simultaneously.
- **Enforcement:** Uses **Pessimistic Row Locking** (`SELECT ... FOR UPDATE`) in Postgres to serialize requests. Exactly 4 succeed and 6 are rejected (HTTP 409) and auto-refunded.

### 2. `concurrency-duplicate.test.ts`
Tests protection against malicious or glitching clients sending duplicate payment confirmations.
- **Scenario:** 10 simultaneous confirmation requests are dispatched for the *exact same* student and class.
- **Enforcement:** Uses a **Three-Layer Defense**:
  1. **Pre-check:** `initiateBooking` rejects if a confirmed booking exists.
  2. **Transaction Check:** The atomic confirmation transaction re-verifies the student's status to safely abort concurrent duplicate attempts.
  3. **Database Constraint:** A partial unique index (`CREATE UNIQUE INDEX ON bookings (student_id, class_id) WHERE status = 'CONFIRMED'`) makes database-level duplication mathematically impossible.

### 3. `concurrency.test.ts`
A precision test for the "Last-Seat Race" (Flash Sale) scenario.
- **Scenario:** A class has 3/4 seats taken. 2 different parents try to grab the final seat at the exact same millisecond.
- **Enforcement:** Ensures strict transaction commit order. One user wins seat #4, while the competitor receives an HTTP 409 "Class Full" error, preventing the class from overbooking to 5/4.

### 4. `payment.test.ts`
Tests integration with the simulated payment gateway.
- **Success:** Verifies `pm_card_success` tokens mark bookings as `CONFIRMED` and allocate seats.
- **Failure:** Verifies `pm_card_decline` tokens mark bookings as `PAYMENT_FAILED` (HTTP 402) and ensure the class seat count is untouched.

### 5. `invariants.test.ts`
Tests the core security rules and business logic constraints of the system.
- **Anti-Spoofing:** Ensures Parent A cannot forge API requests to book a class for Parent B's child (HTTP 403).
- **Roster Isolation:** Ensures Parents cannot view class rosters, and Teachers can only view pedagogical rosters for their *own* classes (billing data stripped).
- **Admin Security:** Verifies that only Admin roles can trigger destructive endpoints like database resets.
