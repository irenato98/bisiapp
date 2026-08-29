# Bisi frontend V6.4.3 — chat UX + visible editable proposals

Base: V6.4.2 natural conversation + individual editable proposals.

## Qué corrige

- El área de mensajes es el único contenedor que hace scroll; las proposals ya no quedan visualmente cortadas detrás del compositor.
- Después de terminar de renderizar un turno/proposal se recalcula su visibilidad con doble `requestAnimationFrame`.
- Las actions de cada proposal (`Cancelar / Confirmar`) quedan sticky mientras esa proposal está dentro del viewport del chat.
- El panel gana algo de alto/ancho útil en desktop sin tocar el planner.
- Cada respuesta de Bisi lleva un personaje pequeño y reservado a la izquierda del turno completo. Las cards estructuradas se alinean debajo del texto, no repiten personaje.
- El personaje hace triple blink una sola vez al entrar la respuesta; no usa mouth animation. Con `prefers-reduced-motion` no hace el blink de entrada.

## Hora fija más tolerante

- Sigue mostrando AM/PM para evitar ambigüedad.
- Acepta `3`, `3:30`, `15` o `15:30`.
- Si escribes `3` con PM, se normaliza a `3:00 PM` y muestra referencia `24 h · 15:00`.
- Si escribes `15`, se normaliza a `3:00 PM` y muestra `24 h · 15:00`.
- Minutos omitidos se completan automáticamente con `:00` al salir del campo.
- Backend sigue recibiendo siempre `HH:MM` 24 h.
- Bloque fijo sigue siendo solo referencia; flexible conserva duración estimada + Bloque editable.

## Se mantiene

- Aviso beta/efímero de V6.4.2.
- Proposals individuales, edición directa sin Editar/Guardar, revise inmutable, Confirmar/Cancelar individual.
- Auto-reconnect del bridge DEV.
- `backendEnabled=false`; Bisi IA solo contra DEV.
- Sin secretos/prompts privados en frontend.
- No se modifica drag/drop, scroll del planner, Day/Week/Month, Today, Focus, racha, complicidad ni timings de V6.

## Smoke

```bash
node scripts/frontend-ai-dev-smoke.mjs
```

## Versión

`6.4.3-dev-ai-chat-ux`
