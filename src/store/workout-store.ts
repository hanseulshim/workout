import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LogType, WeightUnit } from "@/types/database";

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
  restSeconds: number;
  notes: string;
  bestWeight: number | null;
  bestReps: number | null;
  bestDuration: number | null;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  sessionId: string | null;
  name: string;
  routineId: string | null;
  startedAt: string;
  exercises: ActiveExercise[];
}

export interface RestTimerState {
  active: boolean;
  paused: boolean;
  seconds: number;
  exerciseId: string | null;
  endsAt: number | null;
}

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;
  defaultWeightUnit: WeightUnit;
  restTimer: RestTimerState;
  newPr: { exerciseName: string; value: string } | null;

  startWorkout: (workout: ActiveWorkout) => void;
  endWorkout: () => void;
  addExercise: (exercise: ActiveExercise) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (orderedIds: string[]) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => boolean;
  setExerciseRestTime: (exerciseId: string, seconds: number) => void;
  setExerciseNotes: (exerciseId: string, notes: string) => void;
  setSessionId: (id: string) => void;
  setDefaultWeightUnit: (unit: WeightUnit) => void;
  convertWeightUnit: (unit: WeightUnit) => void;
  startRestTimer: (exerciseId: string, seconds?: number) => void;
  pauseRestTimer: () => void;
  stopRestTimer: () => void;
  clearPr: () => void;
  linkSuperset: (exerciseId1: string, exerciseId2: string) => void;
  unlinkSuperset: (exerciseId: string) => void;
}

const DEFAULT_REST_SECONDS = 90;

function makeSetId() {
  return Math.random().toString(36).slice(2);
}

function parsePositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeFloat(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatWeight(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function convertWeightValue(value: string, unit: WeightUnit) {
  if (value.trim() === "") return value;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  const converted = unit === "kg" ? parsed * 0.453592 : parsed * 2.20462;
  return formatWeight(converted);
}

function getRemainingSeconds(timer: RestTimerState) {
  if (!timer.active) return 0;
  if (timer.paused || timer.endsAt === null) return timer.seconds;
  return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
}

function isSetValid(logType: LogType, setItem: ActiveSet) {
  const reps = parsePositiveInt(setItem.reps);
  const weight = parseNonNegativeFloat(setItem.weight);
  const duration = parsePositiveInt(setItem.durationSeconds);

  switch (logType) {
    case "weight_reps":
      return weight !== null && weight > 0 && reps !== null;
    case "bodyweight_reps":
      return reps !== null;
    case "weighted_bodyweight":
      return reps !== null && weight !== null;
    case "duration":
      return duration !== null;
    case "assisted_bodyweight":
      return reps !== null;
    default:
      return true;
  }
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      defaultWeightUnit: "lbs",
      restTimer: {
        active: false,
        paused: false,
        seconds: DEFAULT_REST_SECONDS,
        exerciseId: null,
        endsAt: null,
      },
      newPr: null,

      startWorkout: (workout) => set({ activeWorkout: workout }),
      endWorkout: () =>
        set({
          activeWorkout: null,
          restTimer: {
            active: false,
            paused: false,
            seconds: DEFAULT_REST_SECONDS,
            exerciseId: null,
            endsAt: null,
          },
          newPr: null,
        }),

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
                exercises: state.activeWorkout.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
              }
            : null,
        })),

      reorderExercises: (orderedIds) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const exerciseMap = new Map(state.activeWorkout.exercises.map((exercise) => [exercise.exerciseId, exercise]));
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: orderedIds.map((id) => exerciseMap.get(id)).filter((ex): ex is ActiveExercise => ex !== undefined),
            },
          };
        }),

      addSet: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((exercise) => {
                if (exercise.exerciseId !== exerciseId) return exercise;
                const lastSet = exercise.sets[exercise.sets.length - 1];
                const newSet: ActiveSet = {
                  id: makeSetId(),
                  setNumber: exercise.sets.length + 1,
                  reps: lastSet?.reps ?? "",
                  weight: lastSet?.weight ?? "",
                  weightUnit: lastSet?.weightUnit ?? get().defaultWeightUnit,
                  isBodyweight: lastSet?.isBodyweight ?? false,
                  durationSeconds: lastSet?.durationSeconds ?? "",
                  completed: false,
                };
                return { ...exercise, sets: [...exercise.sets, newSet] };
              }),
            },
          };
        }),

      removeSet: (exerciseId, setId) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((exercise) =>
                  exercise.exerciseId !== exerciseId
                    ? exercise
                    : {
                        ...exercise,
                        sets: exercise.sets
                          .filter((setItem) => setItem.id !== setId)
                          .map((setItem, index) => ({ ...setItem, setNumber: index + 1 })),
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
                exercises: state.activeWorkout.exercises.map((exercise) =>
                  exercise.exerciseId !== exerciseId
                    ? exercise
                    : {
                        ...exercise,
                        sets: exercise.sets.map((setItem) =>
                          setItem.id === setId ? { ...setItem, ...updates } : setItem
                        ),
                      }
                ),
              }
            : null,
        })),

      toggleSetComplete: (exerciseId, setId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return false;

        const exercise = activeWorkout.exercises.find((item) => item.exerciseId === exerciseId);
        const setItem = exercise?.sets.find((item) => item.id === setId);
        if (!exercise || !setItem) return false;

        const completing = !setItem.completed;
        if (completing && !isSetValid(exercise.logType, setItem)) {
          return false;
        }

        set((state) => {
          if (!state.activeWorkout) return {};
          let nextPr = state.newPr;

          const exercises = state.activeWorkout.exercises.map((currentExercise) => {
            if (currentExercise.exerciseId !== exerciseId) return currentExercise;

            let bestWeight = currentExercise.bestWeight;
            let bestReps = currentExercise.bestReps;
            let bestDuration = currentExercise.bestDuration;

            const sets = currentExercise.sets.map((currentSet) => {
              if (currentSet.id !== setId) return currentSet;
              if (!completing) return { ...currentSet, completed: false };

              const weight = parseNonNegativeFloat(currentSet.weight);
              const reps = parsePositiveInt(currentSet.reps);
              const duration = parsePositiveInt(currentSet.durationSeconds);

              if (["weight_reps", "weighted_bodyweight"].includes(currentExercise.logType) && weight !== null) {
                if (bestWeight === null || weight > bestWeight) {
                  bestWeight = weight;
                  nextPr = {
                    exerciseName: currentExercise.exerciseName,
                    value: `${formatWeight(weight)} ${currentSet.weightUnit}`,
                  };
                }
              } else if (currentExercise.logType === "bodyweight_reps" && reps !== null) {
                if (bestReps === null || reps > bestReps) {
                  bestReps = reps;
                  nextPr = {
                    exerciseName: currentExercise.exerciseName,
                    value: `${reps} reps`,
                  };
                }
              } else if (currentExercise.logType === "duration" && duration !== null) {
                if (bestDuration === null || duration > bestDuration) {
                  bestDuration = duration;
                  nextPr = {
                    exerciseName: currentExercise.exerciseName,
                    value: `${duration}s`,
                  };
                }
              }

              return { ...currentSet, completed: true };
            });

            return {
              ...currentExercise,
              bestWeight,
              bestReps,
              bestDuration,
              sets,
            };
          });

          return {
            activeWorkout: { ...state.activeWorkout, exercises },
            newPr: nextPr,
          };
        });

        if (completing && exercise.restSeconds > 0) {
          get().startRestTimer(exerciseId, exercise.restSeconds);
        }

        return true;
      },

      setExerciseRestTime: (exerciseId, seconds) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((exercise) =>
                  exercise.exerciseId === exerciseId ? { ...exercise, restSeconds: seconds } : exercise
                ),
              }
            : null,
        })),

      setExerciseNotes: (exerciseId, notes) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((exercise) =>
                  exercise.exerciseId === exerciseId ? { ...exercise, notes } : exercise
                ),
              }
            : null,
        })),

      setSessionId: (id) =>
        set((state) => ({
          activeWorkout: state.activeWorkout ? { ...state.activeWorkout, sessionId: id } : null,
        })),

      setDefaultWeightUnit: (unit) => set({ defaultWeightUnit: unit }),

      convertWeightUnit: (unit) =>
        set((state) => ({
          defaultWeightUnit: unit,
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: state.activeWorkout.exercises.map((exercise) => ({
                  ...exercise,
                  sets: exercise.sets.map((setItem) => ({
                    ...setItem,
                    weight: convertWeightValue(setItem.weight, unit),
                    weightUnit: unit,
                  })),
                })),
              }
            : null,
        })),

      startRestTimer: (exerciseId, seconds = DEFAULT_REST_SECONDS) =>
        set({
          restTimer:
            seconds > 0
              ? {
                  active: true,
                  paused: false,
                  seconds,
                  exerciseId,
                  endsAt: Date.now() + seconds * 1000,
                }
              : {
                  active: false,
                  paused: false,
                  seconds: 0,
                  exerciseId: null,
                  endsAt: null,
                },
        }),

      pauseRestTimer: () =>
        set((state) => {
          if (!state.restTimer.active) return {};
          if (state.restTimer.paused) {
            return {
              restTimer: {
                ...state.restTimer,
                paused: false,
                endsAt: Date.now() + state.restTimer.seconds * 1000,
              },
            };
          }

          return {
            restTimer: {
              ...state.restTimer,
              paused: true,
              seconds: getRemainingSeconds(state.restTimer),
              endsAt: null,
            },
          };
        }),

      stopRestTimer: () =>
        set({
          restTimer: {
            active: false,
            paused: false,
            seconds: DEFAULT_REST_SECONDS,
            exerciseId: null,
            endsAt: null,
          },
        }),

      clearPr: () => set({ newPr: null }),

      linkSuperset: (exerciseId1, exerciseId2) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const exercise1 = state.activeWorkout.exercises.find((exercise) => exercise.exerciseId === exerciseId1);
          const exercise2 = state.activeWorkout.exercises.find((exercise) => exercise.exerciseId === exerciseId2);
          const supersetId = exercise1?.supersetId ?? exercise2?.supersetId ?? Math.random().toString(36).slice(2);

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId1 ||
                exercise.exerciseId === exerciseId2 ||
                (exercise1?.supersetId && exercise.supersetId === exercise1.supersetId) ||
                (exercise2?.supersetId && exercise.supersetId === exercise2.supersetId)
                  ? { ...exercise, supersetId }
                  : exercise
              ),
            },
          };
        }),

      unlinkSuperset: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return {};
          const exercise = state.activeWorkout.exercises.find((item) => item.exerciseId === exerciseId);
          const supersetId = exercise?.supersetId;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((item) =>
                item.supersetId === supersetId ? { ...item, supersetId: null } : item
              ),
            },
          };
        }),
    }),
    {
      name: "active-workout",
      version: 1,
      migrate: (state) => state,
    }
  )
);
