# workout

Intermediate App Router namespace `/workout` grouping the workout launch flow and active workout logging screen.

## Subdirectories

- [`./start/README.md`](./start/README.md) — `/workout/start`: Authenticates the user, loads routines ordered by recent use, computes per-exercise personal bests and last completed session sets for a preselected `?routine=`, and renders `WorkoutStartClient`.
- [`./[id]/README.md`](./[id]/README.md) — `/workout/[id]`: Renders `ActiveWorkoutScreen` for an active workout session ID with loading spinner and error boundary.

## Verification

```bash
npm run lint && npm run build
```
