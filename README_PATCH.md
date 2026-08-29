# Bisi frontend — DEV AI E2E bridge v6.4

Base: V6 estable / v6.3 `ai-integration-ready`.

## Objetivo

Conectar la interfaz existente de Bisi IA al Worker DEV real sin exponer
`DEV_AUTH_TOKEN`, prompts privados, API keys ni credenciales administrativas.

Worker DEV:

`https://bisiapp-backend-dev.renabiboovie.workers.dev`

## Cambios

- `aiBackendEnabled: true` solo para esta build DEV.
- `backendEnabled` general sigue en `false`: cards/profile/auth general de V6 no se migran todavía.
- `aiDevBrowserBridgeEnabled: true`.
- Al abrir Bisi IA:
  1. abre la sesión temporal `/api/auth/dev-browser-login`;
  2. guarda CSRF solo en memoria;
  3. verifica `/api/auth/session`;
  4. sincroniza hasta 40 cards locales activas como shadow DEV usando sus mismos IDs;
  5. verifica `/api/ai/status`.
- Antes de cada turno se vuelve a sincronizar el shadow para matching/move/prioridad.
- Las cards remotas que ya no están en el set local se neutralizan (`dayKey=null`) en vez de borrarse, para poder reutilizar el mismo ID si reaparece.
- Al cerrar el panel o recibir `safety.closeAiSession=true`, la sesión bridge se revoca con `/api/auth/logout`.
- Mantiene render de:
  - `need_info`
  - `need_match`
  - `priority_suggestion`
  - `proposal`
  - `out_of_scope`
  - `safety`
- Confirmar/Cancelar siguen usando los endpoints server-side de proposal.
- Después de una confirmación simple ejecutada por el servidor, V6 refleja el resultado localmente y vuelve a renderizar el planner.
- Aviso beta ES/EN preservado.
- Ningún secreto ni prompt privado en frontend.

## Importante: límite backend detectado

El backend v0.8.16 actualmente rechaza la confirmación server-side de proposals con
más de una acción (`Server execution for multi-action AI proposals is not enabled yet.`).

Esta build muestra la proposal completa y bloquea Confirmar para proposals multi-card,
dejando Cancelar disponible. No se implementa un bypass client-side
porque violaría la regla de revalidación/ejecución server-side.

## Producción

No usar esta configuración como build final de producción.

El bridge es exclusivamente para el hosting temporal:

- frontend: `https://irenato98.github.io/bisiapp/`
- backend: Worker DEV `workers.dev`

Cuando existan `getbisi.app` y `api.getbisi.app`, se debe retirar
`aiDevBrowserBridgeEnabled` y usar auth real/OAuth con cookies del dominio final.

## Fuentes

No se modificaron. En este repo las seis fuentes `.woff2` existen en
`assets/fonts/` y `assets/css/bisi.css` usa rutas relativas correctas
`../fonts/...`. Los 404 observados contra `/fonts/...` no provienen del código
actual de v6.3/v6.4.

## Smoke estático

Desde la raíz del repo:

```bash
node scripts/frontend-ai-dev-smoke.mjs
```

Resultado esperado en este patch: `26 PASS / 0 FAIL`.

La prueba E2E real del bridge debe hacerse desde GitHub Pages, porque el Worker DEV
acepta exactamente `Origin: https://irenato98.github.io`; localhost se rechaza a propósito.
