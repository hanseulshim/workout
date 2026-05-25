"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HevyImportExerciseMappingCard } from "./hevy-import-exercise-mapping-card";
import type { PreviewData } from "./hevy-import-types";

interface Props {
  preview: PreviewData;
  parseWarnings: string[];
  newExerciseCount: number;
  editingExercise: string | null;
  editValue: string;
  excludedExercises: Set<string>;
  expandedExercises: Set<string>;
  effectiveName: (original: string) => string;
  isMatchedAfterRemap: (original: string) => boolean;
  onDismissWarnings: () => void;
  onEditValueChange: (value: string) => void;
  onToggleExclude: (originalName: string) => void;
  onToggleExpand: (originalName: string) => void;
  onStartEdit: (originalName: string) => void;
  onCommitEdit: (originalName: string) => void;
  onCancelEdit: () => void;
  onReset: () => void;
  onImport: () => void;
}

export function HevyImportPreview({
  preview,
  parseWarnings,
  newExerciseCount,
  editingExercise,
  editValue,
  excludedExercises,
  expandedExercises,
  effectiveName,
  isMatchedAfterRemap,
  onDismissWarnings,
  onEditValueChange,
  onToggleExclude,
  onToggleExpand,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onReset,
  onImport,
}: Props) {
  return (
    <div className="space-y-4">
      {parseWarnings.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {parseWarnings.length} warning{parseWarnings.length === 1 ? "" : "s"} while parsing
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {parseWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={onDismissWarnings}
              className="shrink-0 text-yellow-900/70 hover:text-yellow-900 dark:text-yellow-100/70 dark:hover:text-yellow-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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

      <HevyImportExerciseMappingCard
        preview={preview}
        editingExercise={editingExercise}
        editValue={editValue}
        excludedExercises={excludedExercises}
        expandedExercises={expandedExercises}
        effectiveName={effectiveName}
        isMatchedAfterRemap={isMatchedAfterRemap}
        onEditValueChange={onEditValueChange}
        onToggleExclude={onToggleExclude}
        onToggleExpand={onToggleExpand}
        onStartEdit={onStartEdit}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onReset} className="sm:flex-1">
          Choose another file
        </Button>
        <Button onClick={onImport} className="sm:flex-1">
          Import {preview.sessions.length} sessions + create {newExerciseCount} exercises
        </Button>
      </div>
    </div>
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
