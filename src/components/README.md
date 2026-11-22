# components

Root React UI component tree containing app-wide theme and PWA install wrappers alongside 8 feature and design-system child packages.

## Interface

### Root Components
- `[pwa-install-prompt.tsx:PwaInstallPrompt]` — Client banner prompting PWA installation via the browser's `beforeinstallprompt` event on Android/Chrome or manual "Add to Home Screen" instructions on iOS Safari.
- `[theme-provider.tsx:ThemeProvider]` — Thin client wrapper around `next-themes` `ThemeProvider` forwarding all props.

### Child Packages
- [auth](./auth/README.md) — Supabase Auth login, signup, and logout components.
- [exercises](./exercises/README.md) — Searchable, filterable exercise catalog with multi-select and custom exercise CRUD.
- [import](./import/README.md) — Multi-phase Hevy CSV workout history importer.
- [layout](./layout/README.md) — Responsive mobile header, mobile bottom nav, and desktop sidebar chrome.
- [progress](./progress/README.md) — Recharts exercise progression charts and session history.
- [routines](./routines/README.md) — Drag-and-drop routine builder, scheduling, JSON import/export, volume chart, and session history.
- [ui](./ui/README.md) — `@base-ui/react` design-system primitives and `ErrorView`.
- [workout](./workout/README.md) — Active workout logging screen, rest timer, session start/hydration, and Supabase persistence.

## Invariants

- `[pwa-install-prompt.tsx:PwaInstallPrompt]` — Renders `null` when already running in standalone display mode (`matchMedia("(display-mode: standalone)")` or `navigator.standalone === true`), when previously dismissed via `localStorage`, or when neither a native `beforeinstallprompt` event nor an iOS user agent is detected.

## Side Effects

- `[pwa-install-prompt.tsx:PwaInstallPrompt]` — Reads and writes `localStorage` key `"pwa-install-dismissed"`, attaches/removes a `window` `"beforeinstallprompt"` event listener (calling `e.preventDefault()`), and invokes `prompt.prompt()` / awaits `prompt.userChoice` on install click.
- `[theme-provider.tsx:ThemeProvider]` — Delegates theme class/attribute persistence and system preference listening to `next-themes`.

## Verification

```bash
npm run lint && npm run build
```
