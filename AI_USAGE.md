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
- AI did lift the heavy work of coding but require proper planning (it seems my skill is failed to load, so it didn't happen here) or technical debt would be great (at these case technical debt happen)

---

## 4. Human Steering: Disagreement, Correction, or Rejection of AI Output
- Early analysis againts doc provided plus adding comment on doc file make ai work more directed.
- AI prove to forgot to handled payment refund process. Since there are no bank account or other data, parnet should be able to see how many of their money are stall and will be refunded
- **Cart Reservation vs. Flash-Sale Concurrency Model**:
  - *Initial AI Suggestion*: AI initially leaned toward implementing a temporary 10-minute cart reservation with an expiration timer.
  - *Human Correction / Rejection*: The user rejected the reservation model in favor of a **pure flash-sale model** where no seat is held or price reserved prior to payment. Successful payment is the sole trigger that atomically reserves the seat. If payment succeeds after the seat is taken by a competitor, the transaction is rejected with `409 Conflict` and refunded. This simplified the architecture, eliminated stale reservation cleanup overhead, and matched real-world flash sale requirements.

---

## 5. Workflow Reflections: What to Change Next Time
- **Earlier Database Protocol Alignment**: Prompting for database credentials and engine specifics at the initial setup step avoids having to re-adjust schemas late in the cycle. (These was AI recommendation, personally these is difficult to achieve)
- Still improving on ability to directing ai, hopefully reduce token consumption. These projects eats about 10% weekly limit to documenting and coding
- Making sure if one of my AI skill is loaded perfectly and audit that first

---

## 6. Implementation Verification
- **Automated Concurrency Suite**: Verified via `npm run test:concurrency`, firing simultaneous booking confirmation requests at a `3/4` class to assert that exactly 1 request gets `200 Confirmed` while all other concurrent requests receive `409 Conflict`.
- **Database Engine Invariants**: Verified that the PostgreSQL engine rejects direct attempts to exceed 4 confirmed rows via `CHECK (confirmed_count <= 4)` and blocks duplicate enrollments via the unique index.
- **Manual Verification via Live Audit Log**: Evaluated using the in-app Persona Switcher and Live Audit panel to confirm that `[TEST:*]` tagged logs fire accurately for every edge case.
- **Unit test:** please cek dev_commands.md
