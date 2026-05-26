"use client";

import type { LogType } from "@/types/database";

export interface ExistingExercise {
  id: string;
  name: string;
  log_type: LogType;
}

export interface Props {
  userId: string;
  existingExercises: ExistingExercise[];
}

export interface HevyRow {
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

export interface HevySession {
  key: string;
  title: string;
  startTime: string;
  endTime: string;
  isoStartTime: string;
  isoEndTime: string | null;
  rows: HevyRow[];
}

export interface ExerciseHistorySession {
  date: string;
  sets: string[];
}

export interface ExercisePreview {
  name: string;
  inferredLogType: LogType;
  matched: boolean;
  history: ExerciseHistorySession[];
}

export interface PreviewData {
  fileName: string;
  rows: HevyRow[];
  sessions: HevySession[];
  routines: string[];
  exercises: ExercisePreview[];
}

export interface ImportProgressState {
  completed: number;
  total: number;
  currentSession: string;
}

export interface ImportResult {
  importedSessions: number;
  repairedSessions: number;
  skippedSessions: number;
  failedSessions: number;
  createdExercises: number;
  createdRoutines: number;
}

export interface ParseCsvResult {
  rows: HevyRow[];
  warnings: string[];
}

export type ImportPhase = "idle" | "preview" | "importing" | "done";
