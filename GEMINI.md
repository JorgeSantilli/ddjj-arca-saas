# GEMINI.md - DJControl (ddjj-arca-saas)

Este archivo sirve como memoria técnica y guía de estándares para Gemini CLI en este proyecto.

## 🚀 Resumen del Proyecto
**DJControl** es una plataforma SaaS multi-tenant para contadores que automatiza la consulta y descarga de DDJJ desde ARCA (ex-AFIP) mediante automatización de navegador (Playwright).

## 🛠 Tech Stack
- **Backend:** FastAPI (Python 3.12+), SQLAlchemy 2.0 (Async/Sync), PostgreSQL.
- **Frontend:** Next.js 15 (React 19), Tailwind CSS v4, TypeScript.
- **Automatización:** Playwright (Chromium).
- **Infraestructura:** Railway (Docker-based), Redis (preparado pero opcional en MVP).

## 🏗 Arquitectura y Estándares

### 1. Backend & DB
- **Multi-tenancy:** Todas las tablas tienen `tenant_id`. Las rutas deben filtrar siempre por `tenant_id` obtenido del JWT.
- **Migraciones:** No se usa Alembic en runtime. Las tablas se crean vía `Base.metadata.create_all` y las columnas nuevas se agregan mediante SQL crudo en la lista `migrations` dentro de `lifespan` en `backend/app/main.py`.
- **Scraping:** Se ejecuta de forma **secuencial** mediante un Task Runner propio (`backend/app/tasks/runner.py`) usando `asyncio.Queue` y `asyncio.to_thread`. Esto evita bloqueos de ARCA.

### 2. Frontend
- **Proxy BFF:** Todas las llamadas al backend deben pasar por el proxy de Next.js en `src/app/api/v1/[...proxy]/route.ts` para manejar cookies `httpOnly` y evitar CORS.
- **Componentes:** Usar `useTable.ts` para tablas con persistencia de estado y filtros.
- **Landing Page:** Ubicada en `src/app/page.tsx`, maneja la redirección automática al `/dashboard` si el usuario está autenticado.

### 3. Seguridad
- **JWT:** Almacenado exclusivamente en cookies `httpOnly`. Nunca en `localStorage`.
- **Credenciales ARCA:** Se almacenan en texto plano (según requerimiento de visibilidad del usuario), pero el acceso está restringido por `tenant_id`.

## 📂 Archivos Críticos
- `backend/app/main.py`: Punto de entrada, CORS y migraciones manuales.
- `backend/app/tasks/runner.py`: Lógica de la cola de scraping.
- `backend/app/services/scraper.py`: El motor de Playwright.
- `frontend/src/lib/api.ts`: Cliente de API tipado.
- `frontend/src/app/dashboard/page.tsx`: Vista principal unificada.

## 📜 Comandos Útiles
- **Backend Dev:** `cd backend && uvicorn app.main:app --reload`
- **Frontend Dev:** `cd frontend && npm run dev`
- **Docker:** `docker-compose up --build`

---
*Última actualización: 11 de marzo de 2026*
