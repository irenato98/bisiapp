# Bisi frontend V6.4.2 — natural conversation + individual editable proposals

Base: V6.4.1 AI UX consistency.

## Qué corrige

- Nuevo aviso beta aprobado:
  - ES: `Bisi IA está en beta. Puede cometer errores. Comprueba y revisa la información importante antes de aplicarla. Este chat no se guarda. Si lo cierras, perderás la conversación.`
  - EN equivalente según locale.
- El chat sigue siendo efímero: el historial reciente vive solo en memoria mientras el panel está abierto.
- Cerrar y reabrir el panel serializa el logout/login del bridge DEV para evitar la carrera que podía dejar una sesión recién abierta revocada.
- Un `401/403` hace un único intento automático de reconexión; no debería requerir cerrar sesión de toda la app.
- Mensajes simples no esperan a que termine el shadow sync; matching/move/prioridad de cards existentes sí lo sincronizan cuando hace falta.
- Soporte de `proposals[]`: cada actividad se muestra y se confirma/cancela por separado. No existe ejecución parcial oculta.
- Guard de contrato: si backend dice `proposal` sin una propuesta completa/renderizable, el frontend no muestra un cuadro vacío ni la ejecuta.

## Edición directa de proposals

No hay botón Editar ni Guardar. Tocar/cambiar un campo crea en backend una **nueva proposal inmutable** y reemplaza la anterior, sin Workers AI.

Campos editables:

- siempre: nombre + fecha;
- hora fija: inicio y fin en 12 h con AM/PM;
- hora fija: Bloque visible solo como referencia, derivado del horario;
- flexible: duración estimada + Bloque.

Prioridad, Eisenhower, recurrencia y demás lógica no se convierten en un mini-planner dentro del chat.

## Seguridad / planner

- Confirmar siempre usa la proposal inmutable más reciente.
- Conflicto de `máximo 2 actividades simultáneas` se muestra antes de confirmar si backend lo rechaza.
- Cards creadas por IA sin priorización explícita siguen entrando como `Regular` en V6.
- Flexible sigue siendo flexible; fixed sigue siendo fixed.
- Después de confirmar se refresca el planner y el shadow queda marcado para resincronizar.

## No cambia

- `backendEnabled=false`.
- Bisi IA apunta solo al Worker DEV.
- No hay secretos, tokens ni prompt privado en frontend.
- No se modifican drag/drop, scroll, Day/Week/Month, Today, Focus, racha, complicidad ni timings del planner.

## Smoke

```bash
node scripts/frontend-ai-dev-smoke.mjs
```

## Versión

`6.4.2-dev-ai-natural-proposals`
