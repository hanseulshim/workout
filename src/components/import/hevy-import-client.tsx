"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { parse } from "date-fns";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LogType } from "@/types/database";

interface ExistingExercise {
  id: string;
  name: string;
  log_type: LogType;
}

interface Props {
  userId: string;
  existingExercises: ExistingExercise[];
}

interface HevyRow {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercise_title: string;
  superset_id: string;
  exercise_notes: string;
  set_index: string;
  set_type: string;
  weight_lbs: string;
  reps: string;
  distance_miles: string;
  duration_seconds: string;
  rpe: string;
}

interface HevySession {
  key: string;
  title: string;
  startTime: string;
  endTime: string;
  isoStartTime: string;
  isoEndTime: string | null;
  rows: HevyRow[];
}

interface ExercisePreview {
  name: string;
  inferredLogType: LogType;
  matched: boolean;
}

interface PreviewData {
  fileName: string;
  rows: HevyRow[];
  sessions: HevySession[];
  routines: string[];
  exercises: ExercisePreview[];
}

interface ImportProgressState {
  completed: number;
  total: number;
  currentSession: string;
}

interface ImportResult {
  importedSessions: number;
  skippedSessions: number;
  createdExercises: number;
  createdRoutines: number;
}

type ImportPhase = "idle" | "preview" | "importing" | "done";

export function HevyImportClient({ userId, existingExercises }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knownExercises, setKnownExercises] = useState(existingExercises);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [progress, setProgress] = useState<ImportProgressState>({
    completed: 0,
    total: 0,
    currentSession: "",
  });
  const [result, setResult] = useState<ImportResult | null>(null);

  const newExerciseCount = preview?.exercises.filter((exercise) => !exercise.matched).length ?? 0;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("No workout rows found in that CSV");
        return;
      }

      const nextPreview = buildPreviewData(rows, knownExercises, file.name);
      setPreview(nextPreview);
      setResult(null);
      setProgress({ completed: 0, total: nextPreview.sessions.length, currentSession: "" });
      setPhase("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV");
      resetImport();
    }
  }

  async function handleImport() {
    if (!preview) return;

    const supabase = createClient();
    let nextKnownExercises = [...knownExercises];
    setPhase("importing");
    setProgress({ completed: 0, total: preview.sessions.length, currentSession: "" });

    try {
      const exerciseIdMap = new Map<string, string>();
      for (const exercise of knownExercises) {
        exerciseIdMap.set(normalizeName(exercise.name), exercise.id);
      }

      let createdExercises = 0;
      for (const exercise of preview.exercises.filter((item) => !item.matched)) {
        const { data, error } = await supabase
          .from("exercises")
          .insert({
            name: exercise.name,
            muscle_group: "other",
            category: "other",
            log_type: exercise.inferredLogType,
            is_custom: true,
            user_id: userId,
          })
          .select("id, name")
          .single();

        if (error || !data) {
          throw new Error(`Failed to create exercise: ${exercise.name}`);
        }

        exerciseIdMap.set(normalizeName(exercise.name), data.id);
        nextKnownExercises = [
          ...nextKnownExercises,
          { id: data.id, name: exercise.name, log_type: exercise.inferredLogType },
        ];
        createdExercises += 1;
      }

      setKnownExercises(nextKnownExercises);

      let importedSessions = 0;
      let skippedSessions = 0;

      for (const [index, session] of preview.sessions.entries()) {
        setProgress({
          completed: index,
          total: preview.sessions.length,
          currentSession: session.title,
        });

        const { data: existingSession, error: existingSessionError } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("name", session.title)
          .eq("started_at", session.isoStartTime)
          .maybeSingle();

        if (existingSessionError) {
          throw new Error(`Failed to check existing session: ${session.title}`);
        }

        if (existingSession) {
          skippedSessions += 1;
          setProgress({
            completed: index + 1,
            total: preview.sessions.length,
            currentSession: session.title,
          });
          continue;
        }

        const { data: insertedSession, error: insertSessionError } = await supabase
          .from("workout_sessions")
          .insert({
            user_id: userId,
            name: session.title,
            started_at: session.isoStartTime,
            finished_at: session.isoEndTime,
            routine_id: null,
          })
          .select("id")
          .single();

        if (insertSessionError || !insertedSession) {
          throw new Error(`Failed to import session: ${session.title}`);
        }

        const setRows = session.rows.map((row) => {
          const exerciseId = exerciseIdMap.get(normalizeName(row.exercise_title));
          if (!exerciseId) {
            throw new Error(`Missing exercise mapping for ${row.exercise_title}`);
          }

          return {
            session_id: insertedSession.id,
            exercise_id: exerciseId,
            set_number: toInt(row.set_index, 0) + 1,
            reps: row.reps ? toInt(row.reps, 0) : null,
            weight: row.weight_lbs ? toFloat(row.weight_lbs, 0) : null,
            weight_unit: "lbs" as const,
            is_bodyweight: !row.weight_lbs && !!row.reps,
            duration_seconds: row.duration_seconds ? toInt(row.duration_seconds, 0) : null,
            completed_at: session.isoStartTime,
          };
        });

        const { error: setInsertError } = await supabase.from("workout_sets").insert(setRows);
        if (setInsertError) {
          throw new Error(`Failed to import sets for ${session.title}`);
        }

        importedSessions += 1;
        setProgress({
          completed: index + 1,
          total: preview.sessions.length,
          currentSession: session.title,
        });
      }

      const routineNames = preview.routines;
      const existingRoutineNames = new Set<string>();
      if (routineNames.length > 0) {
        const { data: existingRoutines, error: routineLookupError } = await supabase
          .from("routines")
          .select("name")
          .eq("user_id", userId)
          .in("name", routineNames);

        if (routineLookupError) {
          throw new Error("Failed to check existing routines");
        }

        for (const routine of existingRoutines ?? []) {
          existingRoutineNames.add(routine.name);
        }
      }

      let createdRoutines = 0;
      for (const routineName of routineNames) {
        if (existingRoutineNames.has(routineName)) {
          continue;
        }

        const sourceSession = getMostRecentSessionForRoutine(preview.sessions, routineName);
        if (!sourceSession) {
          continue;
        }

        const { data: routine, error: routineInsertError } = await supabase
          .from("routines")
          .insert({ user_id: userId, name: routineName })
          .select("id")
          .single();

        if (routineInsertError || !routine) {
          throw new Error(`Failed to create routine: ${routineName}`);
        }

        const routineRows = buildRoutineExerciseRows(sourceSession.rows, exerciseIdMap).map((row) => ({
          routine_id: routine.id,
          ...row,
        }));

        if (routineRows.length > 0) {
          const { error: routineExerciseError } = await supabase
            .from("routine_exercises")
            .insert(routineRows);

          if (routineExerciseError) {
            throw new Error(`Failed to create exercises for routine: ${routineName}`);
          }
        }

        createdRoutines += 1;
      }

      const nextResult = {
        importedSessions,
        skippedSessions,
        createdExercises,
        createdRoutines,
      };

      setResult(nextResult);
      setPhase("done");
      toast.success("Hevy import complete");
    } catch (error) {
      setKnownExercises(nextKnownExercises);
      if (preview) {
        setPreview(buildPreviewData(preview.rows, nextKnownExercises, preview.fileName));
      }
      setPhase("preview");
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  }

  function resetImport() {
    setPhase("idle");
    setPreview(null);
    setResult(null);
    setProgress({ completed: 0, total: 0, currentSession: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (phase === "done" && result && preview) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Import complete</CardTitle>
            <CardDescription>{preview.fileName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Sessions imported" value={result.importedSessions.toString()} />
            <SummaryRow label="Duplicate sessions skipped" value={result.skippedSessions.toString()} />
            <SummaryRow label="Exercises created" value={result.createdExercises.toString()} />
            <SummaryRow label="Routines created" value={result.createdRoutines.toString()} />
            <Button onClick={resetImport} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Import another file
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "importing" && preview) {
    const progressValue = progress.total === 0 ? 0 : (progress.completed / progress.total) * 100;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Importing Hevy data
          </CardTitle>
          <CardDescription>{progress.currentSession || preview.fileName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progressValue} className="h-2" />
          <p className="text-sm text-muted-foreground text-right">
            {progress.completed}/{progress.total} sessions imported
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "preview" && preview) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ready to import</CardTitle>
            <CardDescription>{preview.fileName}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <PreviewStat label="Workout sessions" value={preview.sessions.length.toString()} />
            <PreviewStat label="Unique routines" value={preview.routines.length.toString()} />
            <PreviewStat label="Exercises to create" value={newExerciseCount.toString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
            <CardDescription>Matched exercises will reuse your existing library.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {preview.exercises.map((exercise) => (
              <div
                key={exercise.name}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {exercise.matched ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <PlusCircle className="h-4 w-4 shrink-0 text-orange-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{formatLogType(exercise.inferredLogType)}</p>
                  </div>
                </div>
                {exercise.matched ? (
                  <Badge variant="secondary">Matched</Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Create new
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={resetImport} className="sm:flex-1">
            Choose another file
          </Button>
          <Button onClick={handleImport} className="sm:flex-1">
            Import {preview.sessions.length} sessions + create {newExerciseCount} exercises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Hevy CSV</CardTitle>
        <CardDescription>
          Export your history from Hevy, then preview matched exercises before importing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label
          htmlFor="hevy-csv"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors hover:border-primary hover:bg-muted/40"
        >
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Choose a Hevy export file</p>
            <p className="text-sm text-muted-foreground">
              Expected headers include title, start_time, exercise_title, set_index, weight_lbs, reps, and duration_seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            CSV only
          </div>
        </label>
        <input
          ref={fileInputRef}
          id="hevy-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s*\([^)]+\)/g, "") // strip "(Barbell)", "(Weighted)", etc.
    .replace(/-/g, " ") // "Chin-Up" → "Chin Up"
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toFloat(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseCSV(text: string): HevyRow[] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const nextChar = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      if (currentRow.some((field) => field.trim() !== "")) {
        rows.push(currentRow);
      }
      currentField = "";
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((field) => field.trim() !== "")) {
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  const requiredHeaders = [
    "title",
    "start_time",
    "end_time",
    "exercise_title",
    "superset_id",
    "exercise_notes",
    "set_index",
    "set_type",
    "weight_lbs",
    "reps",
    "duration_seconds",
  ];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing required header: ${header}`);
    }
  }

  return rows
    .slice(1)
    .map((values) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      return {
        title: record.title ?? "",
        start_time: record.start_time ?? "",
        end_time: record.end_time ?? "",
        description: record.description ?? "",
        exercise_title: record.exercise_title ?? "",
        superset_id: record.superset_id ?? "",
        exercise_notes: record.exercise_notes ?? "",
        set_index: record.set_index ?? "",
        set_type: record.set_type ?? "",
        weight_lbs: record.weight_lbs ?? "",
        reps: record.reps ?? "",
        distance_miles: record.distance_miles ?? "",
        duration_seconds: record.duration_seconds ?? "",
        rpe: record.rpe ?? "",
      } satisfies HevyRow;
    })
    .filter((row) => row.title && row.start_time && row.exercise_title);
}

function parseHevyDate(value: string) {
  const parsed = parse(value.trim(), "d MMM yyyy, HH:mm", new Date());
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Hevy date: ${value}`);
  }
  return parsed.toISOString();
}

function inferLogType(row: HevyRow): LogType {
  if (row.duration_seconds && !row.reps) return "duration";
  if (!row.weight_lbs && row.reps) return "bodyweight_reps";
  return "weight_reps";
}

function buildPreviewData(rows: HevyRow[], existingExercises: ExistingExercise[], fileName: string): PreviewData {
  const existingByName = new Map(existingExercises.map((exercise) => [normalizeName(exercise.name), exercise]));
  const sessionsByKey = new Map<string, HevySession>();
  const exercises = new Map<string, ExercisePreview>();

  for (const row of rows) {
    const sessionKey = `${row.title}|||${row.start_time}`;
    const isoStartTime = parseHevyDate(row.start_time);
    const isoEndTime = row.end_time ? parseHevyDate(row.end_time) : null;
    const existingSession = sessionsByKey.get(sessionKey);

    if (existingSession) {
      existingSession.rows.push(row);
    } else {
      sessionsByKey.set(sessionKey, {
        key: sessionKey,
        title: row.title,
        startTime: row.start_time,
        endTime: row.end_time,
        isoStartTime,
        isoEndTime,
        rows: [row],
      });
    }

    const normalizedExerciseName = normalizeName(row.exercise_title);
    if (!exercises.has(normalizedExerciseName)) {
      exercises.set(normalizedExerciseName, {
        name: row.exercise_title,
        inferredLogType: inferLogType(row),
        matched: existingByName.has(normalizedExerciseName),
      });
    }
  }

  const sessions = Array.from(sessionsByKey.values()).sort(
    (left, right) => new Date(right.isoStartTime).getTime() - new Date(left.isoStartTime).getTime()
  );

  return {
    fileName,
    rows,
    sessions,
    routines: Array.from(new Set(sessions.map((session) => session.title))),
    exercises: Array.from(exercises.values()).sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function getMostRecentSessionForRoutine(sessions: HevySession[], routineName: string) {
  return sessions
    .filter((session) => session.title === routineName)
    .sort((left, right) => new Date(right.isoStartTime).getTime() - new Date(left.isoStartTime).getTime())[0];
}

function buildRoutineExerciseRows(rows: HevyRow[], exerciseIdMap: Map<string, string>) {
  const rowsByExercise = new Map<string, HevyRow[]>();
  const exerciseOrder: string[] = [];
  const supersetMembers = new Map<string, Set<string>>();

  for (const row of rows) {
    const normalizedExerciseName = normalizeName(row.exercise_title);
    if (!rowsByExercise.has(normalizedExerciseName)) {
      rowsByExercise.set(normalizedExerciseName, []);
      exerciseOrder.push(normalizedExerciseName);
    }
    rowsByExercise.get(normalizedExerciseName)?.push(row);

    const supersetKey = row.superset_id.trim();
    if (supersetKey) {
      if (!supersetMembers.has(supersetKey)) {
        supersetMembers.set(supersetKey, new Set());
      }
      supersetMembers.get(supersetKey)?.add(normalizedExerciseName);
    }
  }

  const supersetIdMap = new Map<string, string>();
  for (const [supersetKey, members] of supersetMembers.entries()) {
    if (members.size > 1) {
      supersetIdMap.set(supersetKey, crypto.randomUUID());
    }
  }

  return exerciseOrder.map((exerciseName, position) => {
    const exerciseRows = (rowsByExercise.get(exerciseName) ?? []).slice().sort(
      (left, right) => toInt(left.set_index, 0) - toInt(right.set_index, 0)
    );

    const exerciseId = exerciseIdMap.get(exerciseName);
    if (!exerciseId) {
      throw new Error(`Missing exercise id for routine exercise: ${exerciseRows[0]?.exercise_title ?? exerciseName}`);
    }

    const setTargets = exerciseRows.map((row) => {
      const reps = row.duration_seconds || row.reps || "";
      return row.weight_lbs ? { reps, weight: row.weight_lbs } : { reps };
    });

    const firstRow = exerciseRows[0];
    const defaultReps = setTargets[0]?.reps ? toInt(setTargets[0].reps, 0) : null;
    const defaultWeight = setTargets[0] && "weight" in setTargets[0] && setTargets[0].weight
      ? toFloat(setTargets[0].weight, 0)
      : null;
    const notes = exerciseRows.find((row) => row.exercise_notes.trim())?.exercise_notes.trim() ?? null;
    const supersetId = firstRow?.superset_id ? supersetIdMap.get(firstRow.superset_id.trim()) ?? null : null;

    return {
      exercise_id: exerciseId,
      position,
      default_sets: setTargets.length,
      default_reps: defaultReps,
      default_weight: defaultWeight,
      set_targets: setTargets,
      superset_id: supersetId,
      notes,
    };
  });
}

function formatLogType(logType: LogType) {
  switch (logType) {
    case "duration":
      return "Duration";
    case "bodyweight_reps":
      return "Bodyweight reps";
    case "weighted_bodyweight":
      return "Weighted bodyweight";
    case "assisted_bodyweight":
      return "Assisted bodyweight";
    default:
      return "Weight + reps";
  }
}
