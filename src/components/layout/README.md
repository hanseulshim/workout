# layout

Responsive application chrome providing mobile top header, mobile bottom navigation bar with overflow menu, and desktop left sidebar.

## Interface

- `[header.tsx:Header]` — Sticky mobile top header (`md:hidden`) displaying the app icon and title.
- `[bottom-nav.tsx:BottomNav]` — Fixed mobile bottom navigation bar (`md:hidden`) with links to `/`, `/routines`, `/history`, `/progress`, `/exercises`, plus a "More" popover menu containing `/import` and sign-out.
- `[sidebar.tsx:Sidebar]` — Fixed desktop left sidebar (`hidden md:flex`) with links to `/`, `/routines`, `/history`, `/progress`, `/exercises`, `/import`, and a footer `LogoutButton`.

## Invariants

- `[bottom-nav.tsx:BottomNav]`, `[sidebar.tsx:Sidebar]` — Active link detection uses exact match (`pathname === "/"`) for the root route and prefix match (`pathname.startsWith(href)`) for all other routes.
- `[bottom-nav.tsx:BottomNav]` — The "More" dialog menu closes on `Escape` keydown or backdrop click.
- `[header.tsx:Header]`, `[bottom-nav.tsx:BottomNav]`, `[sidebar.tsx:Sidebar]` — Mobile (`md:hidden`) and desktop (`hidden md:flex`) navigation shells are mutually exclusive at the `md` breakpoint.

## Side Effects

- `[bottom-nav.tsx:BottomNav]` — `handleLogout` calls `supabase.auth.signOut()`, resets active workout state via `useWorkoutStore().endWorkout()`, and navigates via `router.push("/auth/login")` + `router.refresh()`.
- `[sidebar.tsx:Sidebar]` — Delegates sign-out side effects to `LogoutButton` from `@/components/auth/logout-button`.

## Verification

```bash
npm run lint && npm run build
```
