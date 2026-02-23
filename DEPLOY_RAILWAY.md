# Guia de Deploy en Railway

## Prerequisito: Volúmenes
Tu plan actual de Railway tiene el limite de 3 volúmenes alcanzado.
Opciones:
1. **Upgrade a Pro** ($20/mes) para más volúmenes
2. **Eliminar** volúmenes de proyectos que no uses
3. **Usar servicios externos gratuitos**:
   - PostgreSQL: [Neon](https://neon.tech) (free tier: 0.5GB)
   - Redis: [Upstash](https://upstash.com) (free tier: 10K commands/day)

## Paso 1: Agregar PostgreSQL y Redis

### Opcion A: En Railway (si liberaste volúmenes)
1. Abrir proyecto: https://railway.com/project/e29f1afe-25c0-435b-ad28-748935337610
2. Click `+ New` > Database > PostgreSQL
3. Click `+ New` > Database > Redis

### Opcion B: Neon + Upstash (free, sin volúmenes)
1. Crear DB en https://neon.tech → copiar connection string
2. Crear Redis en https://upstash.com → copiar Redis URL

## Paso 2: Crear servicios desde GitHub

En el dashboard de Railway:

### Backend (web)
1. `+ New` > GitHub Repo > seleccionar `ddjj-arca-saas`
2. Settings:
   - **Root Directory**: `backend`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Builder**: Dockerfile
3. Variables:
```
DATABASE_URL=postgresql+asyncpg://...   (del PostgreSQL service)
CELERY_BROKER_URL=redis://...           (del Redis service)
CELERY_RESULT_BACKEND=redis://...
SECRET_KEY=<openssl rand -hex 32>
FRONTEND_URL=https://frontend-xxx.up.railway.app
RESEND_API_KEY=<tu key>
FROM_EMAIL=DDJJ-ARCA <notificaciones@tudominio.com>
```

### Worker (Celery + Playwright)
1. `+ New` > GitHub Repo > seleccionar `ddjj-arca-saas` (mismo repo)
2. Settings:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile.worker`
   - **Start Command**: (usar el del Dockerfile)
3. Variables: (mismas que backend, más)
```
DATABASE_URL=postgresql+psycopg2://...  (SYNC version!)
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
SECRET_KEY=<mismo que backend>
DOWNLOAD_DIR=descargas
MIN_DELAY=1.5
MAX_DELAY=3.5
```

### Frontend (Next.js)
1. `+ New` > GitHub Repo > seleccionar `ddjj-arca-saas` (mismo repo)
2. Settings:
   - **Root Directory**: `frontend`
   - **Builder**: Nixpacks (auto-detecta Next.js)
3. Variables:
```
BACKEND_URL=http://<backend-service>.railway.internal:<PORT>
```

## Paso 3: Dominios públicos

1. En el servicio **frontend**: Settings > Generate Domain
2. En el servicio **backend**: Settings > Generate Domain (para health checks)

## Paso 4: Verificar

1. Abrir el dominio del frontend → debería mostrar login
2. Registrar una cuenta nueva
3. Agregar un cliente ARCA
4. Ejecutar una consulta de prueba

## Variables de entorno resumen

| Variable | Backend | Worker | Frontend |
|----------|---------|--------|----------|
| DATABASE_URL | asyncpg | psycopg2 | - |
| CELERY_BROKER_URL | si | si | - |
| SECRET_KEY | si | si | - |
| RESEND_API_KEY | si | - | - |
| BACKEND_URL | - | - | si |
| FRONTEND_URL | si | - | - |
