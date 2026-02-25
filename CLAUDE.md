# CLAUDE.md - DJControl (formerly DDJJ-ARCA SaaS)

## Project Overview
**DJControl** — Multi-tenant SaaS for accountants to automate ARCA (ex-AFIP) DDJJ consultation and CSV downloads via browser automation. Each accountant (tenant) manages their own clients with CUIT + clave fiscal credentials.

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

# Deploy to Railway
railway service backend && railway up --detach
railway service frontend && railway up --detach
```

## Architecture
- `backend/app/main.py` — FastAPI app with CORS, lifespan auto-creates tables + inline ALTER TABLE migrations
- `backend/app/db.py` — Async SQLAlchemy engine + session
- `backend/app/models/` — Tenant, User, Cliente, Consulta, Descarga, FormularioDescripcion
- `backend/app/models/form_dictionary.py` — FormularioDescripcion model (per-tenant form labels)
- `backend/app/routers/` — auth, clients, consultations, downloads, form_dictionary, admin
- `backend/app/routers/clients.py` — Client CRUD + ultimo_periodo/estado_ddjj enrichment + password endpoint
- `backend/app/routers/form_dictionary.py` — CRUD for form descriptions + DEFAULT_FORM_DICT + normalize_form_key()
- `backend/app/routers/downloads.py` — Downloads with descripcion_formulario lookup from dictionary
- `backend/app/schemas/client.py` — ClienteResponse includes tipo_cliente, ultimo_periodo, estado_ddjj
- `backend/app/auth/` — JWT creation/verification, password hashing, dependencies
- `backend/app/services/scraper.py` — ARCAScraper class (Playwright automation + table extraction)
- `backend/app/services/email.py` — Resend email notifications
- `backend/app/tasks/runner.py` — In-process async task runner (sequential queue)
- `frontend/src/app/dashboard/page.tsx` — Unified "Centro de Operaciones" (clients + consultations + downloads)
- `frontend/src/hooks/useTable.ts` — Reusable table hook (sort, search, pagination, sessionStorage persistence)
- `frontend/src/app/page.tsx` — DJControl commercial landing page (public, redirects to /dashboard if logged in)
- `frontend/src/app/admin/tenants/page.tsx` — Enriched admin tenants: summary cards + per-studio stats
- `frontend/src/lib/api.ts` — API client with typed functions (clients, consultations, downloads, formDictionary)
- `frontend/src/app/api/v1/[...proxy]/route.ts` — BFF proxy to backend

## Scraping Architecture (MVP)
- **No Celery/Redis** — scraping runs in the backend process via `asyncio.to_thread`
- `backend/app/tasks/runner.py` manages an async queue, processes jobs sequentially
- Uses sync SQLAlchemy (`psycopg2`) inside the thread for DB updates
- **Data capture**: `extraer_tabla()` reads ARCA HTML table via `page.evaluate()` → saves to `descargas` DB table
- CSV files also downloaded to Railway Volume at `/app/descargas`
- `/consultations/logs` endpoint exposes real-time scraper logs to the frontend

## Downloads / Descargas
- DDJJ data is extracted from the ARCA HTML table (NOT from CSV parsing)
- Stored in `descargas` PostgreSQL table with columns: estado, cuit_cuil, formulario, periodo, transaccion, fecha_presentacion
- Frontend shows sortable/searchable table with color-coded estado badges
- Columns include cliente_nombre (joined) and descripcion_formulario (from dictionary)
- CSV files still downloaded to volume as backup, but DB is source of truth

## Form Dictionary
- Default form descriptions in `DEFAULT_FORM_DICT` constant (backend/app/routers/form_dictionary.py)
- Tenant-specific overrides stored in `formulario_descripciones` table
- Matching uses `normalize_form_key()`: lowercase, strip non-alnum, remove leading "f" before digits
- CRUD via `/api/v1/form-dictionary/` endpoints
- Frontend modal in DDJJ section for managing entries

## Client Features
- **tipo_cliente**: "empleador" / "no_empleador" enum field
- **ultimo_periodo**: MAX(descargas.periodo) per client, computed in list endpoint
- **estado_ddjj**: al_dia / atrasado_1 / atrasado_critico / sin_datos (vs fiscal month)
- **Password visibility**: GET /clients/{id}/password returns clave_fiscal (stored plain text)
- **Filters**: "Solo activos" + "Solo atrasados" toggles

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

## DB Migrations (CRITICAL)
- **No Alembic** — using `Base.metadata.create_all` in lifespan (creates new tables only)
- **`create_all` does NOT alter existing tables** — new columns require explicit `ALTER TABLE ADD COLUMN IF NOT EXISTS` in lifespan migrations array
- Migration SQL statements are in `backend/app/main.py` lifespan function

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
- **Form dictionary modal**: accessible from DDJJ section, CRUD for formulario descriptions

## Landing Page & Branding
- Brand name: **DJControl** (updated across login, register, dashboard, admin)
- Route `/` shows commercial landing if user is not authenticated
- If authenticated, `/` redirects to `/dashboard`
- **fetchApi 401 redirect excludes public routes** (`/`, `/login`, `/register`) to prevent redirect loops

## Admin Panel
- `/admin` — Global stats: tenants, users, clients, consultations, success rate
- `/admin/tenants` — Per-studio detail: summary cards (total studios, clients, consultations) + table with clients_count, consultas_count, registration date, active/inactive toggle
- Superadmin user: jorgesantilli1@gmail.com (is_superadmin=true, promoted via direct DB UPDATE)
- To promote a user: `UPDATE users SET is_superadmin = true WHERE email = '...'` via Postgres public URL

## CSS / Tailwind Notes
- Tailwind v4 dark mode can make input text invisible on white backgrounds
- `globals.css` has `input, select, textarea { color: #171717 }`
- All form inputs should have `text-gray-900 placeholder-gray-400` classes
