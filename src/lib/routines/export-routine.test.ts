import { describe, expect, test } from "bun:test";
import { exportRoutineToJSON, type RoutineExerciseRowLike } from "./export-routine";

describe("exportRoutineToJSON", () => {
  test("sorts exercises by position, maps valid days, and exports set_targets", () => {
    const rows: RoutineExerciseRowLike[] = [
      {
        exercise_id: "ex-2",
        position: 2,
        default_sets: 3,
        default_reps: 60,
        set_targets: [{ reps: "45" }, { reps: "60" }],
        notes: "Hold tight",
        rest_seconds: 0,
        superset_id: "ss-1",
        exercises: { name: "Plank", log_type: "duration" },
      },
      {
        exercise_id: "ex-1",
        position: 0,
        default_sets: 3,
        default_reps: 8,
        set_targets: [{ reps: "8", weight: "135" }, { reps: "6", weight: "155" }],
        notes: null,
        rest_seconds: 90,
        superset_id: null,
        exercises: { name: "Bench Press", log_type: "weight_reps" },
      },
      {
        exercise_id: "ex-missing",
        position: 1,
        default_sets: 3,
        default_reps: 10,
        set_targets: null,
        notes: null,
        rest_seconds: null,
        superset_id: null,
        exercises: null,
      },
    ];

    const result = exportRoutineToJSON("Upper A", [-1, 1, 4, 7], rows, "routine-1");

    expect(result).toEqual({
      routine_id: "routine-1",
      name: "Upper A",
      days: ["monday", "thursday"],
      exercises: [
        {
          exercise_id: "ex-1",
          name: "Bench Press",
          rest_seconds: 90,
          sets: [
            { reps: "8", weight: "135" },
            { reps: "6", weight: "155" },
          ],
        },
        {
          exercise_id: "ex-2",
          name: "Plank",
          notes: "Hold tight",
          rest_seconds: 0,
          superset_id: "ss-1",
          sets: [{ duration: "45" }, { duration: "60" }],
        },
      ],
    });
  });

  test("falls back to default_sets and default_reps when set_targets is empty and omits empty days/routine_id", () => {
    const rows: RoutineExerciseRowLike[] = [
      {
        position: 0,
        default_sets: 2,
        default_reps: 12,
        set_targets: [],
        notes: "",
        rest_seconds: null,
        superset_id: null,
        exercises: { name: "Pull Up", log_type: "bodyweight_reps" },
      },
    ];

    const result = exportRoutineToJSON("Pull", [], rows);

    expect(result).toEqual({
      name: "Pull",
      exercises: [
        {
          name: "Pull Up",
          sets: [{ reps: "12" }, { reps: "12" }],
        },
      ],
    });
    expect("routine_id" in result).toBe(false);
    expect("days" in result).toBe(false);
  });
});
