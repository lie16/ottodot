# AI Usage & Collaboration Report

This document records the utilization of AI tools, workflow acceleration points, critical human corrections, and verification procedures for the Ottodot Full-Stack Take-Home assessment.

---

## 1. AI Tools Utilized
- **Antigravity AI (Gemini 3.8 Flash / Pro)**: Primary pair programmer and engineering assistant for architectural analysis, modular documentation authoring, schema design, and concurrency race modeling.

---

## 2. What AI Was Used For
- Extracting requirements and invariants directly from `Ottodot_Full_Stack_Take_Home_Instructions.docx`.
- Structuring modular Obsidian-compliant project documentation (`doc/features/*`, `doc/architecture.md`).
- Generating Prisma ORM data schemas, migration scripts, and large synthetic seed datasets.
- Modeling PostgreSQL atomic transactions and row-locking strategies (`SELECT ... FOR UPDATE`) to prevent overbooking on seat #4.
- Authoring unit and concurrency test scenarios using Jest/Vitest and concurrent `Promise.all` execution.

---

## 3. Acceleration Point: Where AI Accelerated Progress
- **Concurrency Test Formulation**: AI rapidly constructed a multi-threaded/concurrent simulation using `Promise.all` where two simultaneous HTTP/database requests compete for the final seat of a `3/4` class. This saved approximately 30 minutes of boilerplate test harness creation and ensured deterministic verification of the race condition.

---

## 4. Human Steering: Disagreement, Correction, or Rejection of AI Output
- **Cart Reservation vs. Flash-Sale Concurrency Model**:
  - *Initial AI Suggestion*: AI initially leaned toward implementing a temporary 10-minute cart reservation with an expiration timer.
  - *Human Correction / Rejection*: The user rejected the reservation model in favor of a **pure flash-sale model** where no seat is held or price reserved prior to payment. Successful payment is the sole trigger that atomically reserves the seat. If payment succeeds after the seat is taken by a competitor, the transaction is rejected with `409 Conflict` and refunded. This simplified the architecture, eliminated stale reservation cleanup overhead, and matched real-world flash sale requirements.

---

## 5. Workflow Reflections: What to Change Next Time
- **Earlier Database Protocol Alignment**: Prompting for database credentials and engine specifics at the initial setup step avoids having to re-adjust schemas late in the cycle.
- **Direct Modular Feature Scoping**: Starting directly with isolated feature files in `doc/features/` rather than a monolithic specification document improves readability and collaboration from minute one.

---

## 6. Implementation Verification
- **Automated Concurrency Suite**: Verified via `npm run test:concurrency`, firing simultaneous booking confirmation requests at a `3/4` class to assert that exactly 1 request gets `200 Confirmed` while all other concurrent requests receive `409 Conflict`.
- **Database Engine Invariants**: Verified that the PostgreSQL engine rejects direct attempts to exceed 4 confirmed rows via `CHECK (confirmed_count <= 4)` and blocks duplicate enrollments via the unique index.
- **Manual Verification via Live Audit Log**: Evaluated using the in-app Persona Switcher and Live Audit panel to confirm that `[TEST:*]` tagged logs fire accurately for every edge case.
