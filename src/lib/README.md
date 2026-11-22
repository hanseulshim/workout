# lib

Shared client and server utility modules, including Web Audio rest-timer chimes, Tailwind class-name composition, routine export helpers, and Supabase SSR client factories.

## Interface

- `unlockAudio()` `[audio.ts:unlockAudio]` — Lazily creates or resumes the shared `AudioContext` and plays a 1-sample silent buffer; call from a user gesture to unlock audio (required on iOS Safari).
- `keepAudioAlive()` `[audio.ts:keepAudioAlive]` — Plays a silent buffer when the shared `AudioContext` is `"running"`, or resumes it when `"suspended"`, to prevent browser auto-suspension.
- `playRestChime()` `[audio.ts:playRestChime]` — Plays an ascending C5 → E5 → G5 sine-wave triad chime using the Web Audio API.
- `cn(...inputs)` `[utils.ts:cn]` — Merges conditional class names via `clsx` and resolves Tailwind CSS conflicts via `tailwind-merge`.
- [routines](./routines/README.md) — Routine JSON serialization and client-side file download helpers.
- [supabase](./supabase/README.md) — Browser and Next.js server Supabase SSR client factories.

## Invariants

- All audio helpers are no-ops outside a browser (`typeof window === "undefined"`) and fail silently if `AudioContext` / `webkitAudioContext` is unavailable or `ctx.resume()` rejects `[audio.ts:unlockAudio]`, `[audio.ts:keepAudioAlive]`, `[audio.ts:playRestChime]`.
- A single module-level `AudioContext` (`sharedCtx`) is reused across calls and recreated only when null or `"closed"` `[audio.ts:unlockAudio]`, `[audio.ts:keepAudioAlive]`, `[audio.ts:playRestChime]`.
- `playRestChime` expects `unlockAudio` to have been called from a prior user gesture on browsers enforcing autoplay policies `[audio.ts:playRestChime]`.

## Side Effects

- Mutates the module-level `sharedCtx` singleton and interacts with the browser Web Audio API (`AudioContext`, `createBufferSource`, `createOscillator`, `createGain`, `resume`), producing audible sound on `playRestChime` `[audio.ts:unlockAudio]`, `[audio.ts:keepAudioAlive]`, `[audio.ts:playRestChime]`.

## Verification

```bash
npm run lint && npm run build
```
