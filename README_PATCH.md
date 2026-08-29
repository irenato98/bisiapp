# Bisi frontend V6.4.1 — AI UX consistency

Base: V6.4 DEV AI E2E bridge.

## Corrige

- El panel de Bisi IA es usable inmediatamente al abrirse; login/session/shadow arrancan en background.
- La primera sincronización shadow ya no bloquea el textarea.
- Si el shadow local no cambió, no se vuelve a sincronizar innecesariamente.
- Los botones `Create activities` / `Prioritize activities` ya no envían una frase artificial al modelo: responden localmente, instantáneo, en el idioma activo y con voz Bisi.
- Al cambiar el idioma de la app con el panel abierto, el panel se cierra limpiamente y revoca el bridge para evitar mezclar locales.
- Copy de confirmación/cancelación/error ajustado ligeramente a la personalidad de Bisi.

## No cambia

- `backendEnabled=false`.
- Bisi IA sigue apuntando solo al Worker DEV.
- Sin secretos/prompt en frontend.
- Sin cambios de drag/drop, scroll, Day/Week/Month, Focus, racha, complicidad ni timings del planner.

## Versión

`6.4.1-dev-ai-ux-consistency`
