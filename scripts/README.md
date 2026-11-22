# scripts

Standalone CLI utility scripts for ad-hoc reporting and seed-data maintenance outside the Next.js runtime.

- `generate-weekly-report.ts`: Interactive Supabase CLI script that fetches workout routines and writes a weekly Markdown report to `./weekly_routines_report.md`.
- `match-exercise-gifs.mjs`: Node ESM CLI script that resolves built-in exercises against the ExerciseDB OSS API (and hardcoded overrides) and prints SQL `ALTER TABLE` / `UPDATE` statements to `stdout`.

## Interface

Neither script exports module symbols; both execute `main()` on load.

- **Weekly report generator** (`[generate-weekly-report.ts:main]`):
  - Environment variables (optional; prompted via `stdin` if omitted):
    - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
    - `SUPABASE_SERVICE_KEY` or `SUPABASE_KEY`
  - Interactive prompts (`[generate-weekly-report.ts:question]`): Supabase URL/key (when env vars are unset), optional email/password sign-in when the key is not detected as a service role key.
- **Exercise GIF SQL generator** (`[match-exercise-gifs.mjs:main]`):
  - Invocation (per file header): `NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/match-exercise-gifs.mjs`
  - No CLI flags or required environment variables; outputs SQL to `stdout` and progress logs to `stderr`.
  - Key internal tables/helpers: `[match-exercise-gifs.mjs:OUR_EXERCISES]`, `[match-exercise-gifs.mjs:SEARCH_TERMS]`, `[match-exercise-gifs.mjs:HARDCODED_GIFS]`, `[match-exercise-gifs.mjs:searchExercise]`, `[match-exercise-gifs.mjs:scoreMatch]`, `[match-exercise-gifs.mjs:bestMatch]`, `[match-exercise-gifs.mjs:apiFetch]`.

## Invariants

- `generate-weekly-report.ts` requires non-empty Supabase URL and key (exiting with status `1` otherwise) and initializes the client with `auth: { persistSession: false }` (`[generate-weekly-report.ts:main]`).
- A Supabase key is treated as a service-role key (skipping the interactive login prompt) if `key.startsWith("sb_secret_")` or `key.length > 150` (`[generate-weekly-report.ts:main]`).
- Routine `days` indices map `0`–`6` to `Sunday`–`Saturday` (`DAY_LABELS`); empty/null `days` are grouped internally under `"Unscheduled"` (rendered in the weekly overview table as `"Unscheduled / General"` only when non-empty, with empty weekdays rendered as `*Rest Day*`), and out-of-range indices are omitted from the weekly table (`[generate-weekly-report.ts:main]`).
- Detailed routine sections sort routines by `name.localeCompare` and exercises ascending by `position` (rendered 1-indexed as `position + 1`), defaulting missing `default_sets` to `3`, missing `default_reps` to `"N/A"`, missing exercise metadata to `"Unknown Exercise"` / `"N/A"`, and missing `notes` to `"-"` (`[generate-weekly-report.ts:main]`).
- If no routines are returned, `generate-weekly-report.ts` exits with status `0` without writing a report file (`[generate-weekly-report.ts:main]`).
- `match-exercise-gifs.mjs` checks `HARDCODED_GIFS` before calling the ExerciseDB API and resolves hardcoded IDs to `https://static.exercisedb.dev/media/<id>.gif` (`[match-exercise-gifs.mjs:main]`, `[match-exercise-gifs.mjs:GIF_BASE]`).
- `match-exercise-gifs.mjs` normalizes strings to lowercase alphanumeric + single spaces (`[match-exercise-gifs.mjs:normalize]`), scores candidates (`100` exact, `80` prefix, `60` all query words, else `<= 40` proportional), and rejects matches scoring below `20` (`[match-exercise-gifs.mjs:scoreMatch]`, `[match-exercise-gifs.mjs:bestMatch]`).
- `searchExercise` iterates up to `6` deduplicated query variants (derived from `query` and `ourName` words of length `> 3`) and stops at the first non-empty API response (`[match-exercise-gifs.mjs:searchExercise]`).
- `apiFetch` performs up to `3` total attempts (1 initial request + up to 2 retries with `500 * attempt` ms backoff) on HTTP/network failures or empty `json.data` arrays, returning `[]` if all attempts fail (`[match-exercise-gifs.mjs:apiFetch]`); `main` sleeps `400` ms between non-hardcoded lookups (`[match-exercise-gifs.mjs:main]`).
- Generated SQL escapes single quotes in exercise names (`'` → `''`), uses `add column if not exists gif_url text`, and restricts updates to `is_custom = false` (`[match-exercise-gifs.mjs:main]`).

## Side Effects

- **Database / Network**:
  - `generate-weekly-report.ts` optionally authenticates via `supabase.auth.signInWithPassword` and queries `routines` with nested `routine_exercises` and `exercises` (`[generate-weekly-report.ts:main]`).
  - `match-exercise-gifs.mjs` sends HTTPS `GET` requests to `https://oss.exercisedb.dev/api/v1/exercises?name=<encoded>&limit=30` for non-hardcoded exercises (`[match-exercise-gifs.mjs:apiFetch]`).
- **Filesystem**:
  - `generate-weekly-report.ts` creates or overwrites `<cwd>/weekly_routines_report.md` via `fs.writeFileSync` (`[generate-weekly-report.ts:main]`).
- **Process / Streams**:
  - `generate-weekly-report.ts` reads `process.stdin`, logs to `stdout`/`stderr`, and calls `process.exit(0 | 1)` (`[generate-weekly-report.ts:rl]`, `[generate-weekly-report.ts:main]`).
  - `match-exercise-gifs.mjs` writes SQL statements to `stdout` and match progress/summary to `stderr` (`[match-exercise-gifs.mjs:main]`).

## Verification

```bash
npm run lint && npm run build
```
