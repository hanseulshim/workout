"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { HevyImportPreview } from "./hevy-import-preview";
import { HevyImportProgressCard } from "./hevy-import-progress-card";
import { HevyImportSummaryCard } from "./hevy-import-summary-card";
import { HevyImportUploadCard } from "./hevy-import-upload-card";
import type { ExistingExercise, HevyRow, ImportPhase, ImportProgressState, ImportResult, PreviewData, Props } from "./hevy-import-types";
import {
  buildPreviewData,
  buildRoutineExerciseRows,
  getMostRecentSessionForRoutine,
  inferLogType,
  normalizeName,
  parseCSV,
  toFloat,
  toInt,
} from "./hevy-import-utils";
import { useHevyImportExerciseState } from "./use-hevy-import-exercise-state";

export function HevyImportClient({ userId, existingExercises }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knownExercises, setKnownExercises] = useState<ExistingExercise[]>(existingExercises);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [progress, setProgress] = useState<ImportProgressState>({ completed: 0, total: 0, currentSession: "" });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const {
    editingExercise,
    editValue,
    excludedExercises,
    expandedExercises,
    effectiveName,
    isMatchedAfterRemap,
    newExerciseCount,
    setEditValue,
    toggleExclude,
    toggleExpand,
    startEdit,
    commitEdit,
    cancelEdit,
    resetExerciseState,
  } = useHevyImportExerciseState({ preview, knownExercises });

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) {
        toast.error("No workout rows found in that CSV");
        return;
      }

      const nextPreview = buildPreviewData(parsed.rows, knownExercises, file.name);
      setPreview(nextPreview);
      setParseWarnings(parsed.warnings);
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

      for (const exercise of preview.exercises) {
        if (excludedExercises.has(exercise.name)) continue;
        const effective = effectiveName(exercise.name);
        const existing = knownExercises.find((item) => normalizeName(item.name) === normalizeName(effective));
        if (existing) exerciseIdMap.set(normalizeName(exercise.name), existing.id);
      }

      let createdExercises = 0;
      for (const exercise of preview.exercises) {
        if (excludedExercises.has(exercise.name) || exerciseIdMap.has(normalizeName(exercise.name))) continue;

        const effective = effectiveName(exercise.name);
        const { data, error } = await supabase
          .from("exercises")
          .insert({
            name: effective,
            muscle_group: "other",
            category: "other",
            log_type: exercise.inferredLogType,
            is_custom: true,
            user_id: userId,
          })
          .select("id, name")
          .single();

        if (error || !data) throw new Error(`Failed to create exercise: ${effective}`);

        exerciseIdMap.set(normalizeName(exercise.name), data.id);
        nextKnownExercises = [...nextKnownExercises, { id: data.id, name: effective, log_type: exercise.inferredLogType }];
        createdExercises += 1;
      }

      setKnownExercises(nextKnownExercises);

      // Build routine ID map (existing + new) BEFORE importing sessions so sessions
      // can be linked to their routine via routine_id.
      const routineNames = preview.routines;
      const routineIdMap = new Map<string, string>(); // routine name → id

      if (routineNames.length > 0) {
        const { data: existingRoutines, error: routineLookupError } = await supabase
          .from("routines")
          .select("id, name")
          .eq("user_id", userId)
          .in("name", routineNames);

        if (routineLookupError) throw new Error("Failed to check existing routines");
        for (const routine of existingRoutines ?? []) routineIdMap.set(routine.name, routine.id);
      }

      let createdRoutines = 0;
      for (const routineName of routineNames) {
        if (routineIdMap.has(routineName)) continue;

        const sourceSession = getMostRecentSessionForRoutine(preview.sessions, routineName);
        if (!sourceSession) continue;

        const { data: routine, error: routineError } = await supabase
          .from("routines")
          .insert({ user_id: userId, name: routineName })
          .select("id")
          .single();

        if (routineError || !routine) {
          console.warn(`Failed to create routine ${routineName}`, routineError);
          continue;
        }

        const routineRows = buildRoutineExerciseRows(
          sourceSession.rows.filter((row) => !excludedExercises.has(row.exercise_title)),
          exerciseIdMap,
        ).map((row) => ({ routine_id: routine.id, ...row }));

        if (routineRows.length > 0) {
          const { error: routineRowsError } = await supabase.from("routine_exercises").insert(routineRows);
          if (routineRowsError) {
            console.warn(`Failed to create exercises for routine ${routineName}`, routineRowsError);
            await supabase.from("routines").delete().eq("id", routine.id);
            continue;
          }
        }

        routineIdMap.set(routineName, routine.id);
        createdRoutines += 1;
      }

      let importedSessions = 0;
      let repairedSessions = 0;
      let skippedSessions = 0;
      let failedSessions = 0;

      const buildSetRows = (rows: HevyRow[], sessionId: string, completedAt: string) =>
        rows
          .filter((row) => !excludedExercises.has(row.exercise_title))
          .map((row) => {
            const exerciseId = exerciseIdMap.get(normalizeName(row.exercise_title));
            if (!exerciseId) throw new Error(`Missing exercise mapping for ${row.exercise_title}`);
            const weightMissing = row.weight_lbs.trim() === "";
            const logType = inferLogType(row);
            return {
              session_id: sessionId,
              exercise_id: exerciseId,
              set_number: toInt(row.set_index, 0) + 1,
              reps: logType === "duration" ? null : (row.reps ? toInt(row.reps, 0) : null),
              weight: weightMissing ? null : toFloat(row.weight_lbs, 0),
              weight_unit: "lbs" as const,
              is_bodyweight: weightMissing && row.reps.trim() !== "",
              duration_seconds: logType === "duration" ? (row.duration_seconds ? toInt(row.duration_seconds, 0) : null) : null,
              completed_at: completedAt,
            };
          });

      for (const [index, session] of preview.sessions.entries()) {
        setProgress({ completed: index, total: preview.sessions.length, currentSession: session.title });

        const routineId = routineIdMap.get(session.title) ?? null;

        const { data: insertedSession, error: sessionError } = await supabase
          .from("workout_sessions")
          .upsert(
            {
              user_id: userId,
              name: session.title,
              started_at: session.isoStartTime,
              finished_at: session.isoEndTime,
              routine_id: routineId,
            },
            { onConflict: "user_id,started_at", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();

        if (sessionError) throw new Error(`Failed to import session: ${session.title}`);

        if (!insertedSession) {
          // Session already existed — fetch its id for potential repair and routine_id backfill
          const { data: existingSession } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("started_at", session.isoStartTime)
            .single();

          if (existingSession) {
            if (routineId) {
              await supabase
                .from("workout_sessions")
                .update({ routine_id: routineId })
                .eq("id", existingSession.id)
                .is("routine_id", null);
            }

            // Repair: if session has no sets, insert them now
            const { count } = await supabase
              .from("workout_sets")
              .select("id", { count: "exact", head: true })
              .eq("session_id", existingSession.id);

            if (count === 0) {
              const setRows = buildSetRows(session.rows, existingSession.id, session.isoStartTime);
              const { error: repairError } = await supabase.from("workout_sets").insert(setRows);
              if (repairError) {
                console.warn(`Failed to repair sets for session ${session.title}`, repairError);
                failedSessions += 1;
              } else {
                repairedSessions += 1;
              }
              setProgress({ completed: index + 1, total: preview.sessions.length, currentSession: session.title });
              continue;
            }
          }

          skippedSessions += 1;
          setProgress({ completed: index + 1, total: preview.sessions.length, currentSession: session.title });
          continue;
        }

        const setRows = buildSetRows(session.rows, insertedSession.id, session.isoStartTime);

        const { error: setError } = await supabase.from("workout_sets").insert(setRows);
        if (setError) {
          failedSessions += 1;
          const { error: deleteError } = await supabase.from("workout_sessions").delete().eq("id", insertedSession.id);
          if (deleteError) console.warn(`Failed to roll back imported session ${session.title}`, deleteError);
          setProgress({ completed: index + 1, total: preview.sessions.length, currentSession: session.title });
          continue;
        }

        importedSessions += 1;
        setProgress({ completed: index + 1, total: preview.sessions.length, currentSession: session.title });
      }

      setResult({ importedSessions, repairedSessions, skippedSessions, failedSessions, createdExercises, createdRoutines });
      setPhase("done");
      const parts: string[] = [];
      if (importedSessions > 0) parts.push(`${importedSessions} imported`);
      if (repairedSessions > 0) parts.push(`${repairedSessions} repaired`);
      if (failedSessions > 0) parts.push(`${failedSessions} rolled back`);
      toast.success(parts.length > 0 ? `Hevy import complete: ${parts.join(", ")}` : "Hevy import complete");
    } catch (error) {
      setKnownExercises(nextKnownExercises);
      setPreview(buildPreviewData(preview.rows, nextKnownExercises, preview.fileName));
      setPhase("preview");
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  }

  function resetImport() {
    setPhase("idle");
    setPreview(null);
    setResult(null);
    setProgress({ completed: 0, total: 0, currentSession: "" });
    resetExerciseState();
    setParseWarnings([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (phase === "done" && result && preview) {
    return <HevyImportSummaryCard fileName={preview.fileName} result={result} onReset={resetImport} />;
  }

  if (phase === "importing" && preview) {
    return <HevyImportProgressCard fileName={preview.fileName} progress={progress} />;
  }

  if (phase === "preview" && preview) {
    return (
      <HevyImportPreview
        preview={preview}
        parseWarnings={parseWarnings}
        newExerciseCount={newExerciseCount}
        editingExercise={editingExercise}
        editValue={editValue}
        excludedExercises={excludedExercises}
        expandedExercises={expandedExercises}
        effectiveName={effectiveName}
        isMatchedAfterRemap={isMatchedAfterRemap}
        onDismissWarnings={() => setParseWarnings([])}
        onEditValueChange={setEditValue}
        onToggleExclude={toggleExclude}
        onToggleExpand={toggleExpand}
        onStartEdit={startEdit}
        onCommitEdit={commitEdit}
        onCancelEdit={cancelEdit}
        onReset={resetImport}
        onImport={handleImport}
      />
    );
  }

  return <HevyImportUploadCard fileInputRef={fileInputRef} onFileChange={handleFileChange} />;
}
