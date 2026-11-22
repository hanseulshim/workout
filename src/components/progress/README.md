# progress

Exercise progression charts and session history visualization built with Recharts.

## Interface

- `[progress-charts.tsx:ProgressCharts]` — Client component accepting `{ sets: SetRow[] }`. Renders an all-time PR badge, responsive Recharts `LineChart` cards tailored to the exercise's logged metrics, and a reverse-chronological session history list.

## Invariants

- `[progress-charts.tsx:ProgressCharts]` — Expects `sets` ordered ascending by `completed_at` and aggregates them into a `Map` keyed by formatted date (`"MMM d"`), preserving insertion order.
- `[progress-charts.tsx:ProgressCharts]` — Chart mode is mutually exclusive: weighted exercises (`hasWeight`) render Max Weight and Total Volume charts; duration-only exercises (`!hasWeight && hasDuration`) render Max Hold Duration; otherwise Max Reps is rendered.
- `[progress-charts.tsx:ProgressCharts]` — Resolves session date from `workout_sessions.started_at` (handling both single-object and array join shapes) with fallback to `completed_at`.

## Side Effects

None.

## Verification

```bash
npm run lint && npm run build
```
