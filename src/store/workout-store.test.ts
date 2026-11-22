import { beforeEach, describe, expect, test } from "bun:test";
import { useWorkoutStore, type ActiveExercise, type ActiveWorkout } from "./workout-store";

function makeExercise(overrides: Partial<ActiveExercise> = {}): ActiveExercise {
  return {
    exerciseId: "ex-1",
    exerciseName: "Bench Press",
    gifUrl: null,
    logType: "weight_reps",
    supersetId: null,
    restSeconds: 90,
    notes: "",
    bestWeight: 185,
    bestReps: null,
    bestDuration: null,
    sets: [
      {
        id: "set-1",
        setNumber: 1,
        reps: "8",
        weight: "185",
        weightUnit: "lbs",
        isBodyweight: false,
        durationSeconds: "",
        completed: false,
      },
    ],
    ...overrides,
  };
}

function makeWorkout(exercises: ActiveExercise[] = [makeExercise()]): ActiveWorkout {
  return {
    sessionId: "sess-1",
    name: "Push Day",
    routineId: "routine-1",
    startedAt: "2025-03-15T09:00:00.000Z",
    exercises,
  };
}

describe("useWorkoutStore", () => {
  beforeEach(() => {
    useWorkoutStore.getState().endWorkout();
    useWorkoutStore.getState().setDefaultWeightUnit("lbs");
  });

  test("toggleSetComplete validates inputs per logType, tracks monotonic PRs, and starts rest timer", () => {
    const invalidEx = makeExercise({
      sets: [
        {
          id: "set-invalid",
          setNumber: 1,
          reps: "",
          weight: "200",
          weightUnit: "lbs",
          isBodyweight: false,
          durationSeconds: "",
          completed: false,
        },
      ],
    });
    useWorkoutStore.getState().startWorkout(makeWorkout([invalidEx]));
    expect(useWorkoutStore.getState().toggleSetComplete("ex-1", "set-invalid")).toBe(false);
    expect(useWorkoutStore.getState().restTimer.active).toBe(false);

    useWorkoutStore.getState().updateSet("ex-1", "set-invalid", { reps: "5" });
    expect(useWorkoutStore.getState().toggleSetComplete("ex-1", "set-invalid")).toBe(true);

    const state = useWorkoutStore.getState();
    expect(state.newPr).toEqual({ exerciseName: "Bench Press", value: "200 lbs" });
    expect(state.activeWorkout?.exercises[0].bestWeight).toBe(200);
    expect(state.restTimer.active).toBe(true);
    expect(state.restTimer.seconds).toBe(90);
  });

  test("addSet and removeSet maintain contiguous 1-based set numbering", () => {
    useWorkoutStore.getState().startWorkout(makeWorkout());
    useWorkoutStore.getState().addSet("ex-1");
    useWorkoutStore.getState().addSet("ex-1");

    let sets = useWorkoutStore.getState().activeWorkout!.exercises[0].sets;
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);

    useWorkoutStore.getState().removeSet("ex-1", sets[1].id);
    sets = useWorkoutStore.getState().activeWorkout!.exercises[0].sets;
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  test("linkSuperset merges groups and unlinkSuperset dissolves 2-exercise supersets", () => {
    const ex1 = makeExercise({ exerciseId: "ex-1", exerciseName: "Bench" });
    const ex2 = makeExercise({ exerciseId: "ex-2", exerciseName: "Row" });
    const ex3 = makeExercise({ exerciseId: "ex-3", exerciseName: "Curl" });
    useWorkoutStore.getState().startWorkout(makeWorkout([ex1, ex2, ex3]));

    useWorkoutStore.getState().linkSuperset("ex-1", "ex-2");
    const [a1, b1, c1] = useWorkoutStore.getState().activeWorkout!.exercises;
    expect(a1.supersetId).not.toBeNull();
    expect(a1.supersetId).toBe(b1.supersetId);
    expect(c1.supersetId).toBeNull();

    // Unlinking from a 2-member superset dissolves both
    useWorkoutStore.getState().unlinkSuperset("ex-1");
    const [a2, b2] = useWorkoutStore.getState().activeWorkout!.exercises;
    expect(a2.supersetId).toBeNull();
    expect(b2.supersetId).toBeNull();
  });

  test("endWorkout resets session, timer, PR, and pause fields while preserving defaultWeightUnit", () => {
    useWorkoutStore.getState().setDefaultWeightUnit("kg");
    useWorkoutStore.getState().startWorkout(makeWorkout());
    useWorkoutStore.getState().pauseWorkout();
    useWorkoutStore.getState().endWorkout();

    const state = useWorkoutStore.getState();
    expect(state.activeWorkout).toBeNull();
    expect(state.workoutPaused).toBe(false);
    expect(state.pausedAt).toBeNull();
    expect(state.totalPausedMs).toBe(0);
    expect(state.defaultWeightUnit).toBe("kg");
  });
});
