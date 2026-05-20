import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WeightUnit, LogType } from "@/types/database";

export interface ActiveSet {
  id: string;
  setNumber: number;
  reps: string;
  weight: string;
  weightUnit: WeightUnit;
  isBodyweight: boolean;
  durationSeconds: string;
  completed: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  logType: LogType;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  sessionId: string | null;
  name: string;
  routineId: string | null;
  startedAt: string;
  exercises: ActiveExercise[];
}

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;
  defaultWeightUnit: WeightUnit;
  restTimer: { active: boolean; seconds: number; exerciseId: string | null };

  startWorkout: (workout: ActiveWorkout) => void;
  endWorkout: () => void;
  addExercise: (exercise: ActiveExercise) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;
  setSessionId: (id: string) => void;
  setDefaultWeightUnit: (unit: WeightUnit) => void;
  startRestTimer: (exerciseId: string, seconds?: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
}

function makeSetId() {
  return Math.random().toString(36).slice(2);
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      defaultWeightUnit: "lbs",
      restTimer: { active: false, seconds: 90, exerciseId: null },

      startWorkout: (workout) => set({ activeWorkout: workout }),
      endWorkout: () => set({ activeWorkout: null, restTimer: { active: false, seconds: 90, exerciseId: null } }),

      addExercise: (exercise) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? { ...state.activeWorkout, exercises: [...state.activeWorkout.exercises, exercise] }
            : null,
        })),

      removeExercise: (exerciseId) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.filter((e) => e.exerciseId !== exerciseId),
              }
            : null,
        })),

      addSet: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) => {
                if (ex.exerciseId !== exerciseId) return ex;
                const lastSet = ex.sets[ex.sets.length - 1];
                const newSet: ActiveSet = {
                  id: makeSetId(),
                  setNumber: ex.sets.length + 1,
                  reps: lastSet?.reps ?? "",
                  weight: lastSet?.weight ?? "",
                  weightUnit: lastSet?.weightUnit ?? get().defaultWeightUnit,
                  isBodyweight: lastSet?.isBodyweight ?? false,
                  durationSeconds: lastSet?.durationSeconds ?? "",
                  completed: false,
                };
                return { ...ex, sets: [...ex.sets, newSet] };
              }),
            },
          };
        }),

      removeSet: (exerciseId, setId) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((ex) =>
                  ex.exerciseId !== exerciseId
                    ? ex
                    : {
                        ...ex,
                        sets: ex.sets
                          .filter((s) => s.id !== setId)
                          .map((s, i) => ({ ...s, setNumber: i + 1 })),
                      }
                ),
              }
            : null,
        })),

      updateSet: (exerciseId, setId, updates) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((ex) =>
                  ex.exerciseId !== exerciseId
                    ? ex
                    : { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)) }
                ),
              }
            : null,
        })),

      toggleSetComplete: (exerciseId, setId) => {
        const { activeWorkout, defaultWeightUnit } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map((ex) =>
              ex.exerciseId !== exerciseId
                ? ex
                : {
                    ...ex,
                    sets: ex.sets.map((s) =>
                      s.id === setId ? { ...s, completed: !s.completed } : s
                    ),
                  }
            ),
          },
        });
        // Start rest timer when completing a set
        const ex = get().activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
        const s = ex?.sets.find((s) => s.id === setId);
        if (s && !s.completed) {
          get().startRestTimer(exerciseId);
        }
        void defaultWeightUnit;
      },

      setSessionId: (id) =>
        set((state) => ({
          activeWorkout: state.activeWorkout ? { ...state.activeWorkout, sessionId: id } : null,
        })),

      setDefaultWeightUnit: (unit) => set({ defaultWeightUnit: unit }),

      startRestTimer: (exerciseId, seconds = 90) =>
        set({ restTimer: { active: true, seconds, exerciseId } }),

      tickRestTimer: () =>
        set((state) => ({
          restTimer:
            state.restTimer.seconds > 0
              ? { ...state.restTimer, seconds: state.restTimer.seconds - 1 }
              : { active: false, seconds: 0, exerciseId: null },
        })),

      stopRestTimer: () =>
        set({ restTimer: { active: false, seconds: 90, exerciseId: null } }),
    }),
    { name: "active-workout" }
  )
);
