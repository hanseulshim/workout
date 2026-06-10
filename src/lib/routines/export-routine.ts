import type { RoutineExerciseRow } from "@/components/routines/routine-builder-types";

interface ExportedSet {
  weight?: string;
  reps?: string;
  duration?: string;
}

interface ExportedExercise {
  name: string;
  notes?: string;
  rest_seconds?: number;
  sets: ExportedSet[];
}

interface ExportedRoutine {
  name: string;
  days?: string[];
  exercises: ExportedExercise[];
}

const DAY_LABELS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type RoutineExerciseRowLike = Partial<RoutineExerciseRow> & {
  position: number;
  default_sets: number;
  default_reps: number | null;
  set_targets: Array<{ reps: string; weight?: string }> | null;
  notes: string | null;
  rest_seconds: number | null;
  exercises: { name: string; log_type: string } | null;
};

export function exportRoutineToJSON(
  routineName: string,
  days: number[],
  exercises: RoutineExerciseRowLike[]
): ExportedRoutine {
  const dayStrings = days
    .filter((d) => d >= 0 && d < 7)
    .map((d) => DAY_LABELS[d])
    .filter(Boolean);

  const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

  const exportedExercises: ExportedExercise[] = sortedExercises
    .filter((ex) => ex.exercises)
    .map((ex) => {
      const isDuration = ex.exercises?.log_type === "duration";
      const sets: ExportedSet[] = [];

      if (ex.set_targets && ex.set_targets.length > 0) {
        // Use set targets if available
        for (const target of ex.set_targets) {
          const set: ExportedSet = {};
          if (isDuration) {
            set.duration = target.reps;
          } else {
            set.reps = target.reps;
            if ((target as { weight?: string }).weight) {
              set.weight = (target as { weight?: string }).weight;
            }
          }
          sets.push(set);
        }
      } else {
        // Use default sets and reps
        const numSets = ex.default_sets || 1;
        for (let i = 0; i < numSets; i++) {
          const set: ExportedSet = {};
          if (isDuration && ex.default_reps != null) {
            set.duration = String(ex.default_reps);
          } else if (ex.default_reps != null) {
            set.reps = String(ex.default_reps);
          }
          sets.push(set);
        }
      }

      const exported: ExportedExercise = {
        name: ex.exercises!.name,
        sets,
      };

      if (ex.notes) {
        exported.notes = ex.notes;
      }

      if (ex.rest_seconds != null && ex.rest_seconds > 0) {
        exported.rest_seconds = ex.rest_seconds;
      }

      return exported;
    });

  return {
    name: routineName,
    ...(dayStrings.length > 0 && { days: dayStrings }),
    exercises: exportedExercises,
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
