# supabase

Supabase database configuration and schema definition root for the workout application. Contains no direct application source files; all database DDL, RLS policies, seed data, and RPC definitions live in `./migrations`.

## Subdirectories

- [`./migrations/README.md`](./migrations/README.md) — Ordered PostgreSQL migrations (`001_initial_schema.sql` through `010_routine_days.sql`) defining the 5 core tables (`exercises`, `routines`, `routine_exercises`, `workout_sessions`, `workout_sets`), enums, indexes, RLS policies, 96-exercise seed library, backfills, and progress RPC functions (`get_user_exercises`, `get_user_last_sets`).

## Verification

Repository-level verification command:

```bash
npm run lint && npm run build
```
