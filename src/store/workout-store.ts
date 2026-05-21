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
  gifUrl: string | null;
  logType: LogType;
  supersetId: string | null;
  restSeconds: number; // 0 = no auto-rest
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
  reorderExercises: (orderedIds: string[]) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;
  setExerciseRestTime: (exerciseId: string, seconds: number) => void;
  setSessionId: (id: string) => void;
  setDefaultWeightUnit: (unit: WeightUnit) => void;
  startRestTimer: (exerciseId: string, seconds?: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
  linkSuperset: (exerciseId1: string, exerciseId2: string) => void;
  unlinkSuperset: (exerciseId: string) => void;
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

      reorderExercises: (orderedIds) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const map = new Map(state.activeWorkout.exercises.map((e) => [e.exerciseId, e]));
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: orderedIds.map((id) => map.get(id)!).filter(Boolean),
            },
          };
        }),

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
        // Check current state before toggling
        const ex = activeWorkout.exercises.find((e) => e.exerciseId === exerciseId);
        const wasCompleted = ex?.sets.find((s) => s.id === setId)?.completed ?? false;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map((e) =>
              e.exerciseId !== exerciseId
                ? e
                : { ...e, sets: e.sets.map((s) => s.id === setId ? { ...s, completed: !s.completed } : s) }
            ),
          },
        });
        // Auto-start rest timer when marking complete (not when uncompleting)
        if (!wasCompleted && ex && ex.restSeconds > 0) {
          get().startRestTimer(exerciseId, ex.restSeconds);
        }
        void defaultWeightUnit;
      },

      setExerciseRestTime: (exerciseId, seconds) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((e) =>
                  e.exerciseId === exerciseId ? { ...e, restSeconds: seconds } : e
                ),
              }
            : null,
        })),

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

      linkSuperset: (exerciseId1, exerciseId2) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const ex1 = state.activeWorkout.exercises.find((e) => e.exerciseId === exerciseId1);
          const ex2 = state.activeWorkout.exercises.find((e) => e.exerciseId === exerciseId2);
          // Inherit an existing supersetId, or create a new one
          const supersetId = ex1?.supersetId ?? ex2?.supersetId ?? Math.random().toString(36).slice(2);
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) =>
                ex.exerciseId === exerciseId1 ||
                ex.exerciseId === exerciseId2 ||
                (ex1?.supersetId && ex.supersetId === ex1.supersetId) ||
                (ex2?.supersetId && ex.supersetId === ex2.supersetId)
                  ? { ...ex, supersetId }
                  : ex
              ),
            },
          };
        }),

      unlinkSuperset: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const ex = state.activeWorkout.exercises.find((e) => e.exerciseId === exerciseId);
          const sid = ex?.supersetId;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.supersetId === sid ? { ...e, supersetId: null } : e
              ),
            },
          };
        }),
    }),
    { name: "active-workout" }
  )
);
