# GEMINI.md - DJControl (ddjj-arca-saas)

Este archivo sirve como memoria técnica y guía de estándares para Gemini CLI en este proyecto.

## 🚀 Resumen del Proyecto
**DJControl** es una plataforma SaaS multi-tenant para contadores que automatiza la consulta y descarga de DDJJ desde ARCA (ex-AFIP) mediante automatización de navegador (Playwright).

## 🛠 Tech Stack
- **Backend:** FastAPI (Python 3.12+), SQLAlchemy 2.0 (Async/Sync), PostgreSQL.
- **Frontend:** Next.js 15 (React 19), Tailwind CSS v4, TypeScript.
- **Automatización:** Playwright (Chromium) + **Extensión de Chrome (Arca Access)** para autologin.
- **Infraestructura:** Railway (Docker-based), Redis (preparado pero opcional en MVP).

## 🏗 Arquitectura y Estándares

### 1. Backend & DB
- **Multi-tenancy:** Todas las tablas tienen `tenant_id`. Las rutas deben filtrar siempre por `tenant_id` obtenido del JWT.
- **Migraciones:** No se usa Alembic en runtime. Las tablas se crean vía `Base.metadata.create_all` y las columnas nuevas se agregan mediante SQL crudo en la lista `migrations` dentro de `lifespan` en `backend/app/main.py`.
- **Scraping:** Se ejecuta de forma **secuencial** mediante un Task Runner propio (`backend/app/tasks/runner.py`) usando `asyncio.Queue` y `asyncio.to_thread`. Esto evita bloqueos de ARCA.

### 2. Frontend & Extensión
- **Proxy BFF:** Todas las llamadas al backend pasan por el proxy de Next.js.
- **Autologin ARCA:** Se implementó una integración con la extensión de Chrome personalizada (ID fijo: `nbfnfekncehjlecnhhpkimddjdjkogol`). El frontend se comunica con la extensión vía `chrome.runtime.sendMessage`.
- **Componentes:** Usar `useTable.ts` para tablas. Se añadieron pestañas de estado en la vista de descargas.

### 3. Seguridad
- **JWT:** Almacenado exclusivamente en cookies `httpOnly`. Nunca en `localStorage`.
- **Credenciales ARCA:** Se almacenan en texto plano (según requerimiento de visibilidad del usuario), pero el acceso está restringido por `tenant_id`.
- **Extensión:** Las credenciales se borran del almacenamiento de Chrome (`chrome.storage.local`) inmediatamente después de completar el login.

## 📂 Archivos Críticos
- `backend/app/main.py`: Punto de entrada, CORS y migraciones manuales.
- `backend/app/tasks/runner.py`: Lógica de la cola de scraping.
- `backend/app/services/scraper.py`: El motor de Playwright.
- `extension/`: Código fuente de la extensión de Chrome Arca Access.
- `frontend/src/app/dashboard/page.tsx`: Vista principal con banner de extensión y botón Entrar ARCA.

## 📜 Comandos Útiles
- **Backend Dev:** `cd backend && uvicorn app.main:app --reload`
- **Frontend Dev:** `cd frontend && npm run dev`
- **Docker:** `docker-compose up --build`

---
*Última actualización: 11 de marzo de 2026*
