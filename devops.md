# DevOps & Server Deployment Guide

This document captures all commands and procedures for deploying the Ottodot Trial Booking service to remote servers (Staging / Production), containerization, and CI/CD pipelines.

---

## 1. Prerequisites & Environment Setup

```bash
# Ensure server has Docker & Docker Compose installed
docker --version
docker compose version
```

---

## 2. Container Build & Packaging

```bash
# Build production Docker image
docker build -t ottodot-booking:latest -f Dockerfile .

# Tag image for registry
docker tag ottodot-booking:latest registry.example.com/ottodot/booking:latest

# Push to container registry
docker push registry.example.com/ottodot/booking:latest
```

---

## 3. Remote Staging Deployment

```bash
# Pull latest staging image
docker compose -f docker-compose.staging.yml pull

# Run database migrations on staging
docker compose -f docker-compose.staging.yml run --rm app npm run db:migrate:prod

# Zero-downtime container recreate
docker compose -f docker-compose.staging.yml up -d --remove-orphans
```

---

## 4. Production Deployment & Verification

```bash
# Pull and apply to production
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm app npm run db:migrate:prod
docker compose -f docker-compose.prod.yml up -d

# Health check verification
curl -f https://api.ottodot.com/health || echo "Deployment health check failed!"
```

---

## 5. Rollback Procedure

```bash
# Revert to previous image tag
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d ottodot-booking:<PREVIOUS_TAG>
```
