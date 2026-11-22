# app

Next.js App Router root configuring the global HTML document shell, theme and toast providers, PWA metadata/viewport, 404 page, and root error boundary.

## Interface

- `[layout.tsx:metadata]` — Root Next.js `Metadata` (`title: "Workout Tracker"`, description, `/manifest.json`, Apple touch icon, and Apple web app configuration).
- `[layout.tsx:viewport]` — Root Next.js `Viewport` (`themeColor: "#09090b"`, non-scalable mobile viewport).
- `[layout.tsx:RootLayout]` — Root Server Component rendering `<html lang="en" suppressHydrationWarning>`, `GeistSans` font on `<body>`, `ThemeProvider` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`), `{children}`, and `sonner` `Toaster` (`richColors`, `position="top-center"`).
- `[not-found.tsx:NotFound]` — App-wide 404 page with a link back to `/`.
- `[global-error.tsx:GlobalError]` — Root client error boundary rendering a standalone `<html><body>` fallback with retry button (`reset`).
- Subdirectories:
  - [`./(app)/README.md`](<./(app)/README.md>) — Authenticated application shell (`AppLayout`), dashboard (`/`), and feature routes (`exercises`, `history`, `import`, `progress`, `routines`, `workout`).
  - [`./auth/README.md`](./auth/README.md) — Authentication routes (`/auth/login`, `/auth/signup`, `/auth/callback`).

## Invariants

- `[layout.tsx:RootLayout]` — Sets `suppressHydrationWarning` on `<html>` to avoid class mismatch warnings with `ThemeProvider`.
- `[global-error.tsx:GlobalError]` — Renders its own `<html>` and `<body>` wrapper as required by Next.js root error boundaries.

## Side Effects

- `[global-error.tsx:GlobalError]` — Logs caught errors to `console.error` inside a `useEffect` whenever `error` changes.

## Verification

```bash
npm run lint && npm run build
```
