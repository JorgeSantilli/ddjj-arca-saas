# CLAUDE.md - DDJJ-ARCA SaaS

## Project Overview
Multi-tenant SaaS for accountants to automate ARCA (ex-AFIP) DDJJ consultation and CSV downloads via browser automation. Each accountant (tenant) manages their own clients with CUIT + clave fiscal credentials.

## Tech Stack
- **Backend**: Python FastAPI (async) + SQLAlchemy 2.0 + PostgreSQL + Celery/Redis
- **Frontend**: Next.js 15 (React 19) + Tailwind CSS + TypeScript
- **Auth**: PyJWT + pwdlib[argon2] + httpOnly cookies
- **Scraper**: Playwright (Chromium headless)
- **Email**: Resend
- **Deploy**: Railway (web + worker + PostgreSQL + Redis)

## Monorepo Structure
```
backend/     → FastAPI app
frontend/    → Next.js app
```

## Commands
```bash
# Backend dev
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (MUST use --pool=solo for Playwright)
celery -A app.celery_app worker --pool=solo --loglevel=info

# Frontend dev
cd frontend && npm install && npm run dev

# Docker (full stack)
docker-compose up
```

## Architecture
- `backend/app/main.py` — FastAPI app with CORS, lifespan auto-creates tables
- `backend/app/db.py` — Async SQLAlchemy engine + session
- `backend/app/models/` — Tenant, User, Cliente, Consulta (all with tenant_id)
- `backend/app/routers/` — auth, clients, consultations, downloads, admin
- `backend/app/auth/` — JWT creation/verification, password hashing, dependencies
- `backend/app/services/scraper.py` — ARCAScraper class (Playwright automation)
- `backend/app/services/email.py` — Resend email notifications
- `backend/app/tasks/scraping.py` — Celery task wrapping ARCAScraper
- `backend/app/celery_app.py` — Celery configuration
- `frontend/src/app/` — Next.js App Router pages
- `frontend/src/lib/api.ts` — API client with typed functions
- `frontend/src/app/api/v1/[...proxy]/route.ts` — BFF proxy to backend

## Key Constraints
- **Sequential scraping only** — never parallel browser instances (ARCA blocks)
- **Random delays** — 1.5-3.5s between actions (anti-detection)
- **Text-based selectors** — ARCA uses dynamic IDs that change per session
- **Celery --pool=solo** — prefork pool breaks Playwright
- **Playwright inside task** — never at module level
- **All UI text in Spanish**

## Auth Libraries (CRITICAL)
- **DO use**: PyJWT (`import jwt`) — official FastAPI recommendation
- **DO NOT use**: python-jose — abandoned, no releases since 2022
- **DO use**: pwdlib[argon2] — official FastAPI recommendation
- **DO NOT use**: passlib — abandoned
- **DO use**: httpOnly cookies for JWT storage
- **DO NOT use**: localStorage for tokens
- **PyJWT `sub` claim MUST be string** — encode with `str(user_id)`, decode and cast back with `int()`

## Multi-Tenant Pattern
Every data model has `tenant_id` column. Every route uses `get_current_tenant_id()` dependency to filter data. JWT contains `tenant_id` claim.

## Railway Deployment
- **Frontend**: https://frontend-production-ca6d.up.railway.app
- **Backend**: https://backend-production-b04c.up.railway.app
- Railway assigns port **8080** (not 8000) — internal URLs use `http://service.railway.internal:8080`
- Frontend uses **standalone output** — Dockerfile runs `node .next/standalone/server.js` (NOT `npm start`)
- Worker service requires manual Railway dashboard config: Root Directory `backend`, Dockerfile Path `Dockerfile.worker`
- Use Dockerfiles (NOT Nixpacks) for all services

## CSS / Tailwind Notes
- Tailwind v4 dark mode can make input text invisible on white backgrounds — always set explicit `color` on inputs
- `globals.css` has `input, select, textarea { color: #171717 }` to prevent dark mode inheritance
- All form inputs should have `text-gray-900 placeholder-gray-400` classes
