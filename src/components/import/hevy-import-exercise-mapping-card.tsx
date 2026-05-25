"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Pencil, PlusCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewData } from "./hevy-import-types";
import { formatLogType } from "./hevy-import-utils";

interface Props {
  preview: PreviewData;
  editingExercise: string | null;
  editValue: string;
  excludedExercises: Set<string>;
  expandedExercises: Set<string>;
  effectiveName: (original: string) => string;
  isMatchedAfterRemap: (original: string) => boolean;
  onEditValueChange: (value: string) => void;
  onToggleExclude: (originalName: string) => void;
  onToggleExpand: (originalName: string) => void;
  onStartEdit: (originalName: string) => void;
  onCommitEdit: (originalName: string) => void;
  onCancelEdit: () => void;
}

export function HevyImportExerciseMappingCard({
  preview,
  editingExercise,
  editValue,
  excludedExercises,
  expandedExercises,
  effectiveName,
  isMatchedAfterRemap,
  onEditValueChange,
  onToggleExclude,
  onToggleExpand,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercises</CardTitle>
        <CardDescription>
          Click an exercise to see its history. Use ✏️ to rename, or toggle off to skip importing it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {preview.exercises.map((exercise) => {
          const effective = effectiveName(exercise.name);
          const matched = isMatchedAfterRemap(exercise.name);
          const remapped = effective !== exercise.name;
          const isEditing = editingExercise === exercise.name;
          const excluded = excludedExercises.has(exercise.name);
          const expanded = expandedExercises.has(exercise.name);

          return (
            <div key={exercise.name} className={`rounded-lg border ${excluded ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onToggleExpand(exercise.name)}
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {excluded ? (
                  <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : matched ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <PlusCircle className="h-4 w-4 shrink-0 text-warning" />
                )}

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="w-full rounded border bg-background px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                        value={editValue}
                        onChange={(event) => onEditValueChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") onCommitEdit(exercise.name);
                          if (event.key === "Escape") onCancelEdit();
                        }}
                        onBlur={() => onCommitEdit(exercise.name)}
                      />
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          onCancelEdit();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="truncate font-medium">{effective}</p>
                  )}
                  {remapped && !isEditing ? (
                    <p className="text-xs text-muted-foreground">was: {exercise.name}</p>
                  ) : (
                    !isEditing && (
                      <p className="text-xs text-muted-foreground">
                        {exercise.history.length} session{exercise.history.length !== 1 ? "s" : ""} · {formatLogType(exercise.inferredLogType)}
                      </p>
                    )
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!isEditing && !excluded && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => onStartEdit(exercise.name)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {excluded ? (
                    <Badge variant="secondary">Skipped</Badge>
                  ) : matched ? (
                    <Badge variant="secondary">Matched</Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning text-warning">
                      Create new
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleExclude(exercise.name)}
                    className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                      excluded
                        ? "border-muted-foreground text-muted-foreground"
                        : "border-destructive text-destructive hover:bg-destructive/10"
                    }`}
                  >
                    {excluded ? "Include" : "Skip"}
                  </button>
                </div>
              </div>

              {expanded && exercise.history.length > 0 && (
                <div className="space-y-2 border-t px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{effective}</p>
                  {exercise.history.map((session) => (
                    <div key={session.date}>
                      <p className="text-xs font-medium text-muted-foreground">{session.date}</p>
                      <p className="text-xs text-foreground">{session.sets.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
