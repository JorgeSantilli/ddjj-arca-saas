# CLAUDE.md - DDJJ-ARCA SaaS

## Project Overview
Multi-tenant SaaS for accountants to automate ARCA (ex-AFIP) DDJJ consultation and CSV downloads via browser automation. Each accountant (tenant) manages their own clients with CUIT + clave fiscal credentials.

## Tech Stack
- **Backend**: Python FastAPI (async) + SQLAlchemy 2.0 + PostgreSQL
- **Frontend**: Next.js 15 (React 19) + Tailwind CSS + TypeScript
- **Auth**: PyJWT + pwdlib[argon2] + httpOnly cookies
- **Scraper**: Playwright (Chromium headless, in-process via asyncio.to_thread)
- **Email**: Resend
- **Deploy**: Railway (backend + frontend + PostgreSQL + Volume)

## Monorepo Structure
```
backend/     → FastAPI app + Playwright scraper
frontend/    → Next.js app
```

## Commands
```bash
# Backend dev
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend dev
cd frontend && npm install && npm run dev

# Docker (full stack)
docker-compose up

# Deploy to Railway
railway service backend && railway up --detach
railway service frontend && railway up --detach
```

## Architecture
- `backend/app/main.py` — FastAPI app with CORS, lifespan auto-creates tables
- `backend/app/db.py` — Async SQLAlchemy engine + session
- `backend/app/models/` — Tenant, User, Cliente, Consulta, Descarga
- `backend/app/models/download.py` — Descarga model (DDJJ records extracted from ARCA)
- `backend/app/routers/` — auth, clients, consultations, downloads, admin
- `backend/app/auth/` — JWT creation/verification, password hashing, dependencies
- `backend/app/services/scraper.py` — ARCAScraper class (Playwright automation + table extraction)
- `backend/app/services/email.py` — Resend email notifications
- `backend/app/tasks/runner.py` — In-process async task runner (sequential queue)
- `frontend/src/app/dashboard/page.tsx` — Unified "Centro de Operaciones" (clients + consultations + downloads)
- `frontend/src/hooks/useTable.ts` — Reusable table hook (sort, search, pagination, sessionStorage persistence)
- `frontend/src/lib/api.ts` — API client with typed functions
- `frontend/src/app/api/v1/[...proxy]/route.ts` — BFF proxy to backend

## Scraping Architecture (MVP)
- **No Celery/Redis** — scraping runs in the backend process via `asyncio.to_thread`
- `backend/app/tasks/runner.py` manages an async queue, processes jobs sequentially
- Uses sync SQLAlchemy (`psycopg2`) inside the thread for DB updates
- **Data capture**: `extraer_tabla()` reads ARCA HTML table via `page.evaluate()` → saves to `descargas` DB table
- CSV files also downloaded to Railway Volume at `/app/descargas`
- `/consultations/logs` endpoint exposes real-time scraper logs to the frontend
- Frontend has a log viewer panel (dark terminal style) with auto-refresh

## Downloads / Descargas
- DDJJ data is extracted from the ARCA HTML table (NOT from CSV parsing)
- Stored in `descargas` PostgreSQL table with columns: estado, cuit_cuil, formulario, periodo, transaccion, fecha_presentacion
- Frontend shows sortable/searchable table with color-coded estado badges
- CSV files still downloaded to volume as backup, but DB is source of truth

## Key Constraints
- **Sequential scraping only** — never parallel browser instances (ARCA blocks)
- **Random delays** — 1.5-3.5s between actions (anti-detection)
- **Text-based selectors** — ARCA uses dynamic IDs that change per session
- **Playwright inside thread** — never at module level, import inside task function
- **All UI text in Spanish**

## Auth Libraries (CRITICAL)
- **DO use**: PyJWT (`import jwt`)
- **DO NOT use**: python-jose — abandoned
- **DO use**: pwdlib[argon2]
- **DO NOT use**: passlib — abandoned
- **DO use**: httpOnly cookies for JWT storage
- **DO NOT use**: localStorage for tokens
- **PyJWT `sub` claim MUST be string** — encode with `str(user_id)`, decode with `int()`

## Multi-Tenant Pattern
Every data model has `tenant_id` column. Every route uses `get_current_tenant_id()` dependency to filter data. JWT contains `tenant_id` claim.

## Railway Deployment
- **Frontend**: https://frontend-production-ca6d.up.railway.app
- **Backend**: https://backend-production-b04c.up.railway.app
- **Volume**: `backend-volume` mounted at `/app/descargas` (persistent file storage)
- Railway assigns port **8080** (not 8000)
- Frontend uses **standalone output** — `node .next/standalone/server.js`
- Backend uses `mcr.microsoft.com/playwright/python:v1.58.0-noble`
- Use Dockerfiles (NOT Nixpacks) for all services
- **Playwright pip version MUST match Docker image version**
- **Container filesystem is ephemeral** — use Railway Volume for persistent files

## Frontend Architecture
- **Unified dashboard**: `/dashboard` page combines Clients, Consultations, and Downloads in one view
- **useTable hook**: Reusable for sort/search/pagination across all tables, persists pageSize in sessionStorage
- **Navigation**: "Operaciones" (unified) + "Descargas" (standalone) + Admin (superadmin only)
- **`skipTrailingSlashRedirect: true`** in `next.config.ts` — CRITICAL: prevents Next.js 308 redirects that strip cookies from BFF proxy API calls
- **API URLs use trailing slashes** (`/clients/`, `/downloads/`) — FastAPI requires them

## CSS / Tailwind Notes
- Tailwind v4 dark mode can make input text invisible on white backgrounds
- `globals.css` has `input, select, textarea { color: #171717 }`
- All form inputs should have `text-gray-900 placeholder-gray-400` classes
