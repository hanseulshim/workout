"use client";

import { parse } from "date-fns";
import type { ExerciseCategory, LogType, MuscleGroup } from "@/types/database";
import type {
  ExistingExercise,
  ExercisePreview,
  HevyRow,
  HevySession,
  ParseCsvResult,
  PreviewData,
} from "./hevy-import-types";

const EQUIPMENT_QUALIFIERS =
  /\s*\((Barbell|Dumbbell|Cable|Machine|Suspension|Band|Kettlebell|EZ Bar|Plate|Smith Machine)\)/gi;

export function normalizeName(value: string) {
  return value
    .trim()
    .replace(EQUIPMENT_QUALIFIERS, "")
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type MuscleGroupRule = { keywords: RegExp; muscle_group: MuscleGroup; category: ExerciseCategory };

const MUSCLE_GROUP_RULES: MuscleGroupRule[] = [
  // Legs — hamstrings (before generic "deadlift" so RDL/Nordic/Jefferson match first)
  { keywords: /romanian deadlift|rdl|nordic hamstring|jefferson curl|good morning|leg curl/i, muscle_group: "hamstrings", category: "strength" },
  // Legs — quads
  { keywords: /squat|leg press|leg extension|step.?up|lunge|split squat|pistol/i, muscle_group: "quads", category: "strength" },
  // Legs — calves
  { keywords: /calf raise|calf press|tibialis/i, muscle_group: "calves", category: "strength" },
  // Legs — glutes
  { keywords: /hip thrust|glute bridge|abduction|adduction|sumo/i, muscle_group: "glutes", category: "strength" },
  // Back
  { keywords: /pull.?up|chin.?up|pulldown|row|pullover|pull down|lat |deadlift|back extension/i, muscle_group: "back", category: "strength" },
  // Chest
  { keywords: /bench press|chest press|chest fly|pec|push.?up|decline push|incline push|dip/i, muscle_group: "chest", category: "strength" },
  // Shoulders
  { keywords: /overhead press|shoulder press|lateral raise|front raise|face pull|external rotation|internal rotation|handstand push|arnold|upright row/i, muscle_group: "shoulders", category: "strength" },
  // Biceps
  { keywords: /curl|bicep/i, muscle_group: "biceps", category: "strength" },
  // Triceps
  { keywords: /tricep|skull crusher|close.?grip|overhead extension/i, muscle_group: "triceps", category: "strength" },
  // Core
  { keywords: /planche|l.?sit|front lever|dragon flag|ab |abs |crunch|sit.?up|hanging leg|leg raise|hollow|tuck hold|oblique/i, muscle_group: "core", category: "strength" },
  // Full body / calisthenics skills
  { keywords: /muscle.?up|clean|snatch|thruster|burpee|turkish/i, muscle_group: "full_body", category: "strength" },
  // Handstand — shoulders/core → shoulders as primary
  { keywords: /handstand/i, muscle_group: "shoulders", category: "strength" },
];

export function inferMuscleGroup(name: string): { muscle_group: MuscleGroup; category: ExerciseCategory } {
  for (const rule of MUSCLE_GROUP_RULES) {
    if (rule.keywords.test(name)) {
      return { muscle_group: rule.muscle_group, category: rule.category };
    }
  }
  return { muscle_group: "other", category: "other" };
}

export function toInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function toFloat(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseCSV(text: string): ParseCsvResult {
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
      if (currentRow.some((field) => field.trim() !== "")) rows.push(currentRow);
      currentField = "";
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((field) => field.trim() !== "")) rows.push(currentRow);
  if (rows.length < 2) return { rows: [], warnings: [] };

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
    if (!headers.includes(header)) throw new Error(`Missing required header: ${header}`);
  }

  const warningCounts = new Map<string, number>();
  const parsedRows: HevyRow[] = [];

  for (const values of rows.slice(1)) {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const row = {
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

    const missingFields: string[] = [];
    if (!row.title.trim()) missingFields.push("title");
    if (!row.start_time.trim()) missingFields.push("start_time");
    if (!row.exercise_title.trim()) missingFields.push("exercise_title");

    if (missingFields.length > 0) {
      const reason = `missing ${missingFields.join(", ")}`;
      warningCounts.set(reason, (warningCounts.get(reason) ?? 0) + 1);
      continue;
    }

    parsedRows.push(row);
  }

  const warnings = Array.from(warningCounts.entries()).map(
    ([reason, count]) => `${count} row${count === 1 ? "" : "s"} skipped: ${reason}`,
  );

  return { rows: parsedRows, warnings };
}

export function parseHevyDate(value: string) {
  const parsed = parse(value.trim(), "d MMM yyyy, HH:mm", new Date());
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Hevy date: ${value}`);
  }
  return parsed.toISOString();
}

export function inferLogType(row: HevyRow): LogType {
  if (row.duration_seconds && !row.reps) return "duration";
  if (row.weight_lbs.trim() === "" && row.reps) return "bodyweight_reps";
  if (/\(weighted\)/i.test(row.exercise_title)) return "weighted_bodyweight";
  return "weight_reps";
}

export function buildPreviewData(rows: HevyRow[], existingExercises: ExistingExercise[], fileName: string): PreviewData {
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
        history: [],
      });
    }
  }

  const exerciseHistoryMap = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    const normalizedExerciseName = normalizeName(row.exercise_title);
    if (!exerciseHistoryMap.has(normalizedExerciseName)) exerciseHistoryMap.set(normalizedExerciseName, new Map());
    const sessionMap = exerciseHistoryMap.get(normalizedExerciseName)!;
    if (!sessionMap.has(row.start_time)) sessionMap.set(row.start_time, []);

    let setLabel = `${row.reps} reps`;
    if (row.duration_seconds) {
      const seconds = parseInt(row.duration_seconds, 10);
      setLabel = seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds}s`;
    } else if (row.weight_lbs.trim() !== "") {
      setLabel = `${row.weight_lbs} × ${row.reps}`;
    }

    sessionMap.get(row.start_time)!.push(setLabel);
  }

  for (const [normalizedExerciseName, sessionMap] of exerciseHistoryMap.entries()) {
    const exercise = exercises.get(normalizedExerciseName);
    if (!exercise) continue;
    exercise.history = Array.from(sessionMap.entries())
      .sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime())
      .map(([date, sets]) => ({ date, sets }));
  }

  const sessions = Array.from(sessionsByKey.values()).sort(
    (left, right) => new Date(right.isoStartTime).getTime() - new Date(left.isoStartTime).getTime(),
  );

  return {
    fileName,
    rows,
    sessions,
    routines: Array.from(new Set(sessions.map((session) => session.title))),
    exercises: Array.from(exercises.values()).sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export function getMostRecentSessionForRoutine(sessions: HevySession[], routineName: string) {
  return sessions
    .filter((session) => session.title === routineName)
    .sort((left, right) => new Date(right.isoStartTime).getTime() - new Date(left.isoStartTime).getTime())[0];
}

export function buildRoutineExerciseRows(rows: HevyRow[], exerciseIdMap: Map<string, string>) {
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
      if (!supersetMembers.has(supersetKey)) supersetMembers.set(supersetKey, new Set());
      supersetMembers.get(supersetKey)?.add(normalizedExerciseName);
    }
  }

  const supersetIdMap = new Map<string, string>();
  for (const [supersetKey, members] of supersetMembers.entries()) {
    if (members.size > 1) supersetIdMap.set(supersetKey, crypto.randomUUID());
  }

  return exerciseOrder.map((exerciseName, position) => {
    const exerciseRows = (rowsByExercise.get(exerciseName) ?? []).slice().sort(
      (left, right) => toInt(left.set_index, 0) - toInt(right.set_index, 0),
    );

    const exerciseId = exerciseIdMap.get(exerciseName);
    if (!exerciseId) {
      throw new Error(`Missing exercise id for routine exercise: ${exerciseRows[0]?.exercise_title ?? exerciseName}`);
    }

    const setTargets = exerciseRows.map((row) => {
      const reps = row.duration_seconds || row.reps || "";
      return row.weight_lbs.trim() === "" ? { reps } : { reps, weight: row.weight_lbs };
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

export function formatLogType(logType: LogType) {
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
