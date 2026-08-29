# Bisi frontend — IA integration ready v6.3

Base: `bisi_prebackend_final` (V6 estable).

## Qué cambia

- Integra el panel existente de Bisi IA con el contrato estructurado del backend (`/api/ai/*`).
- Añade render para `need_info`, `need_match`, `priority_suggestion`, `proposal`, `out_of_scope` y `safety`.
- Las proposals muestran todas las acciones con título, fecha, horario, duración, bloque, recurrencia y ubicación actual cuando es un movimiento.
- Confirmar y cancelar usan los endpoints de proposal del backend.
- Las proposals `within_block` intentan resolverse a un horario exacto usando el planner real antes de mostrar Confirmar.
- Tras confirmación server-side de una acción simple, el frontend refleja localmente el mismo resultado para que la card aparezca/mueva sin esperar una recarga.
- `safety.closeAiSession=true` cierra la sesión de IA (deshabilita el composer) sin cerrar toda la app.
- Cualquier logout/session-clear aborta requests pendientes y elimina el panel para impedir respuestas tardías de la sesión anterior.
- Añade el aviso beta discreto acordado en ES/EN.
- BisiBackend incorpora helpers de IA, `credentials: include`, manejo de errores JSON y CSRF en memoria/cookie cuando esté disponible.

## Activación deliberadamente pendiente

En `assets/js/bisi.config.js`:

```js
backendEnabled: false,
aiBackendEnabled: false,
aiApiBase: '/api',
```

Esto es intencional. El frontend actual sigue con la cuenta beta/local y todavía no existe el enlace real de sesión OAuth/CSRF con el backend. Activar IA ahora contra el Worker DEV produciría 401/403 y no sería una integración válida.

Cuando se conecte auth/backend (o cuando exista el dominio final), se configurará `aiBackendEnabled: true`, `aiApiBase` al origen correcto y el CSRF de la sesión se entregará a `BisiBackend.setCsrfToken(...)` o será accesible por cookie same-site.

## No cambia

- Creación/centrado/scroll de cards.
- Drag & drop y autoscroll.
- Day / Week / Month / Today.
- Racha, Complicidad, Focus.
- Timings de V6.
- Login local actual.
- Producción/backend.

## Archivos

- `assets/js/bisi.config.js`
- `assets/js/bisi.js`
- `assets/css/bisi.css`

No incluye secretos, tokens, prompts privados ni claves API.
