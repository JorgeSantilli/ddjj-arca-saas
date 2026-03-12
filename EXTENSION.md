# EXTENSION.md - Arca Access Chrome Extension

Este documento detalla el desarrollo, los desafíos técnicos y la implementación final de la extensión de Chrome para el autologin en ARCA.

## 🚀 Logros Principales

1.  **ID Permanente:** Se implementó una clave pública fija en el `manifest.json` para garantizar que la extensión tenga el mismo ID (`nbfnfekncehjlecnhhpkimddjdjkogol`) en todas las instalaciones.
2.  **Persistencia en Recargas:** La extensión utiliza `chrome.storage.local` para mantener el CUIT y la Clave durante la recarga de página obligatoria que realiza el portal de ARCA entre el paso 1 (CUIT) y el paso 2 (Clave).
3.  **Seguridad por Diseño:**
    *   Las credenciales se transmiten de forma cifrada (HTTPS) y se inyectan solo en el dominio oficial de AFIP.
    *   La extensión borra automáticamente las credenciales de la memoria del navegador inmediatamente después de completar el login con éxito.
4.  **Distribución Autónoma:** Se añadió un botón en el Dashboard de la aplicación web para descargar la extensión en formato `.zip`, permitiendo que cualquier usuario de la plataforma la instale fácilmente en modo desarrollador.

## 🛠 Desafíos y Soluciones

### 1. El Linter de Producción (Next.js)
*   **Problema:** El despliegue en Railway fallaba porque TypeScript no permitía tipos `any` o genéricos como `Function` al interactuar con la API de Chrome (`chrome.runtime.sendMessage`).
*   **Solución:** Se definieron interfaces estrictas en el frontend (`ChromeMessage`, `ChromeResponse`, `ChromeRuntime`) para cumplir con los estándares de producción de Next.js.

### 2. Pérdida de Estado tras "Siguiente"
*   **Problema:** Al presionar el botón "Siguiente" en ARCA, la página se recargaba por completo. Esto hacía que el script de la extensión perdiera la variable que contenía la clave fiscal, dejando el campo de contraseña vacío.
*   **Solución:** Se rediseñó el flujo para guardar el estado en el almacenamiento local de Chrome (`chrome.storage.local`). El script ahora lee el estado al cargar la página y detecta si está en el paso 1 o en el paso 2 de forma independiente.

### 3. Habilitación del Botón "Ingresar"
*   **Problema:** Al pegar la clave mediante JavaScript, el botón de "Ingresar" de ARCA permanecía deshabilitado porque la página no detectaba actividad real del usuario.
*   **Solución:** Se añadieron disparadores de eventos múltiples (`input`, `change`, `blur`) para simular la interacción humana y asegurar que el sistema de validación de la página web habilitara el botón de login.

## 📋 Instrucciones de Instalación para Usuarios

1.  Descargar el archivo `.zip` desde el Dashboard.
2.  Descomprimir el contenido en una carpeta local.
3.  Abrir Chrome e ir a `chrome://extensions`.
4.  Activar el **"Modo de desarrollador"**.
5.  Hacer clic en **"Cargar descomprimida"** y seleccionar la carpeta `/extension`.

## 🔒 Seguridad
La comunicación externa (`externally_connectable`) está limitada exclusivamente al dominio de producción y a `localhost:3000` para evitar que otros sitios web maliciosos intenten enviar peticiones de login a la extensión.

---
*Documentación generada por Gemini CLI - 11 de marzo de 2026*
