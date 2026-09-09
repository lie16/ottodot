# Ottodot Trial Booking System

Reliable trial booking system slice for live online science and math classes for kids, featuring strict capacity enforcement (max 4 students) and ACID-compliant last-seat concurrency race condition resolution.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ & pnpm
- PostgreSQL running locally or via Docker
- Configured `.env.local` (see `.env.example`)

### Setup & Run
```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm run db:migrate

# 3. Seed large synthetic dataset (classes, parents, students, edge cases)
pnpm run db:seed

# 4. Start development server
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 What Was Built

1. **Role & Persona Switcher**: Instant switching between `Admin`, `Teacher` (Sarah / John), and `Parent` (Alice / Bob / Carol) without authentication friction.
2. **Admin Dashboard**: Global visibility across all classes, real-time capacities (`x/4`), full student rosters, and payment references.
3. **Teacher Portal**: Scoped class views restricted strictly to assigned classes (`403 Forbidden` on cross-teacher queries); student preparation rosters with financial details omitted.
4. **Parent Discovery & Isolated Registration**: Class discovery with live seat counts, strictly isolated child selector (`parent_id = current_parent.id`), registration history, and duplicate booking prevention.
5. **Flash-Sale Payment Flow & Last-Seat Race Handling**:
   - `pending_payment` -> `confirmed` | `payment_failed` | `rejected_capacity_full`.
   - Simulated payment cards (`pm_card_success` vs `pm_card_decline`).
   - Atomic PostgreSQL transaction with exclusive row locking (`SELECT ... FOR UPDATE` on `trial_classes`).
   - Flash-sale model: successful payment is the sole confirmation of a reserved seat. Concurrent loser receives `409 Conflict` and immediate refund/abort.
6. **Dedicated Test Case Audit Logger**: Structured tags (`[TEST:RACE_CONDITION]`, `[TEST:DUPLICATE_BOOKING]`, `[TEST:PAYMENT_FAILURE]`, `[TEST:CAPACITY_LIMIT]`, `[TEST:AUTH_ISOLATION]`) logged to stdout and displayed in an in-app Live Audit panel.
7. **One-Click Edge Case Runner & DB Reset**: Instant triggers for the 4 core edge cases and `POST /api/test/reset` endpoint to restore clean seed data.

---

## ⏱️ Time Spent
- Target timebox: 3–4 hours.
- Breakdown:
  - Architecture, schema design, and modular documentation: 1 hr
  - Backend database invariants, Prisma ORM, and atomic locking transactions: 30 m
  - API routes, persona authorization middleware, and state machine: 30 mins
  - Interactive UI, Live Audit Log feed, and test runner: 30 mins
  - Concurrency test suites, seed scripts, and verification: 1 hr

---

## 🧠 Key Architecture & Backend Decisions

### Concurrency Model: Flash Sale with Row-Level Lock
- **Why**: Reserving seats during "checkout initiation" introduces complex lock timeouts, cart abandonment cleanup cron jobs, and inventory hoarding vulnerabilities. In a 4-student class, a flash-sale model guarantees that a seat is only finalized when payment succeeds.
- **How**: Within an ACID transaction, we execute `SELECT ... FOR UPDATE` on the `trial_classes` record. If `confirmed_count < 4`, the booking transitions to `confirmed`, the count increments, and the transaction commits. If another user committed payment first, `confirmed_count >= 4` is detected inside the lock boundary; the second transaction rolls back, marks the booking `rejected_capacity_full`, and responds with `409 Conflict`.
- **Database-Level Invariants**:
  - `CREATE UNIQUE INDEX idx_unique_confirmed_booking ON bookings (student_id, class_id) WHERE status = 'confirmed';`
  - `ALTER TABLE trial_classes ADD CONSTRAINT check_max_capacity CHECK (confirmed_count <= 4);`

---

## ✂️ What Was Deliberately Cut (Scope Control)
- Real Stripe / payment gateway webhooks (mocked via deterministic tokens).
- Full user authentication / password hashing (replaced with a multi-role persona switcher for rapid evaluation).
- Regular recurring enrollment and subscription billing (scoped strictly to trial bookings).
- Refund method

---

## 📡 What to Monitor After Release
1. **Lock Contention / Transaction Duration**: Monitor PostgreSQL transaction wait times on `trial_classes` row locks.
2. **Race Conflict Rate (`409 Conflict`)**: Track frequency of concurrent booking attempts on the 4th seat.
3. **Payment Decline Ratios**: Alert if payment failure rates spike unexpectedly.

---

## 🔮 What to Do Next with More Time
- Implement Redis distributed locking for multi-region database scaling.
- Webhook-driven asynchronous payment fulfillment with idempotent event deduplication.
- Automated email/SMS notification queues for parents upon confirmed enrollment.
- Actual payment integration with refund
- Proper UI
- Class reminder and scheduling
- Auditable log either grafana or elk
- Well I think there are a lot to be implemented for ecommerce with school based method that had teacher and schedule.
