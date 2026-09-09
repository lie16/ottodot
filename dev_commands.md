# Local Development Commands Guide

This document captures all commands and procedures for local development, development server startup, database migrations, seeding, and test execution for the Ottodot Trial Booking project.

---

## 1. Environment & Dependency Setup

```bash
# Copy local environment flavor
cp .env.example .env.local

# Install project dependencies using pnpm
pnpm install
```

---

## 2. Local Database Lifecycle

```bash
# Start local development database (Docker container if applicable)
docker compose -f docker-compose.dev.yml up -d db

# Run database migrations
pnpm run db:migrate

# Seed synthetic test data (20 classes, 12 parents, 24 children, 6 teachers)
pnpm run db:seed

# Reset and re-seed database (clean slate)
pnpm run db:reset
```

---

## 3. Development Server

```bash
# Start development server with hot-reload
pnpm run dev

# Verify local health endpoint
curl -i http://localhost:3000/api/health
```

---

## 4. Test Suite Execution

```bash
# Run all unit and integration tests (16 tests across 5 files)
pnpm run test

# Run all concurrency tests (Race Condition, Stampede, Duplicate Spam)
pnpm run test:concurrency

# Run tests in watch mode
pnpm run test:watch

# Run specific test suites directly
npx vitest tests/payment.test.ts
npx vitest tests/invariants.test.ts

# Inspect structured test-case audit logs from database
pnpm run logs

# Inspect persistent disk audit log file
cat logs/audit.log
```
