# workout

Next.js (App Router, React 19, TypeScript) Progressive Web App for workout tracking, routine authoring, exercise library management, progression analytics, and Hevy CSV / AI JSON import backed by Supabase (PostgreSQL + Auth).

## Architecture & Subdirectories

| Directory | Contract | Summary |
| --- | --- | --- |
| `src` | [./src/README.md](./src/README.md) | Application source tree: auth middleware, Next.js App Router pages/routes (`src/app`), React UI components (`src/components`), shared utilities & Supabase SSR clients (`src/lib`), persisted Zustand active-workout store (`src/store`), and Supabase database TypeScript types (`src/types`). |
| `supabase` | [./supabase/README.md](./supabase/README.md) | Ordered PostgreSQL/Supabase SQL migrations (`001`–`010`) defining the 5 core tables (`exercises`, `routines`, `routine_exercises`, `workout_sessions`, `workout_sets`), 5 domain enums, RLS policies, 2 progress RPC functions (`get_user_exercises`, `get_user_last_sets`), and exercise seed/backfill data. |
| `scripts` | [./scripts/README.md](./scripts/README.md) | Standalone CLI scripts for generating Markdown weekly routine reports from Supabase (`generate-weekly-report.ts`) and generating ExerciseDB GIF URL SQL updates (`match-exercise-gifs.mjs`). |

## Local Interface & Invariants

- **Build & PWA Configuration** `[next.config.ts:withPWA, next.config.ts:nextConfig]`: Wraps Next.js config with `@ducanh2912/next-pwa` (`dest: "public"`, `cacheOnFrontEndNav: true`, `aggressiveFrontEndNavCaching: true`, `reloadOnOnline: true`, `workboxOptions.disableDevLogs: true`, disabled when `NODE_ENV === "development"`), and permits remote Next/Image loading from `https://static.exercisedb.dev`.
- **Lint Configuration** `[eslint.config.mjs:eslintConfig]`: Applies `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, ignoring `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`.
- **Package Scripts** `[package.json:scripts]`: Exposes `dev` (`next dev --webpack`), `build` (`next build --webpack`), `start` (`next start`), `lint` (`eslint`), and `test` (`bun test`).
- **Environment Contract**: Application runtime requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `src/middleware.ts` and `src/lib/supabase/`).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Verification

```bash
npm test && npm run lint && npm run build
```
