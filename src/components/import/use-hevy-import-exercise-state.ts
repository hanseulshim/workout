"use client";

import { useCallback, useMemo, useState } from "react";
import type { ExistingExercise, PreviewData } from "./hevy-import-types";
import { normalizeName } from "./hevy-import-utils";

interface Props {
  preview: PreviewData | null;
  knownExercises: ExistingExercise[];
}

export function useHevyImportExerciseState({ preview, knownExercises }: Props) {
  const [exerciseRemaps, setExerciseRemaps] = useState<Record<string, string>>({});
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [excludedExercises, setExcludedExercises] = useState<Set<string>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const effectiveName = useCallback(
    (original: string) => exerciseRemaps[original] ?? original,
    [exerciseRemaps],
  );

  const isMatchedAfterRemap = useCallback(
    (original: string) => {
      const effective = effectiveName(original);
      return knownExercises.some((exercise) => normalizeName(exercise.name) === normalizeName(effective));
    },
    [effectiveName, knownExercises],
  );

  const newExerciseCount = useMemo(
    () =>
      preview?.exercises.filter((exercise) => !excludedExercises.has(exercise.name) && !isMatchedAfterRemap(exercise.name)).length ??
      0,
    [excludedExercises, isMatchedAfterRemap, preview],
  );

  function toggleExclude(originalName: string) {
    setExcludedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(originalName)) {
        next.delete(originalName);
        return next;
      }

      next.add(originalName);
      setExerciseRemaps((current) => {
        if (!(originalName in current)) return current;
        const updated = { ...current };
        delete updated[originalName];
        return updated;
      });
      setEditingExercise((current) => (current === originalName ? null : current));
      return next;
    });
  }

  function toggleExpand(originalName: string) {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(originalName)) next.delete(originalName);
      else next.add(originalName);
      return next;
    });
  }

  function startEdit(originalName: string) {
    setEditingExercise(originalName);
    setEditValue(effectiveName(originalName));
  }

  function commitEdit(originalName: string) {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== originalName) {
      setExerciseRemaps((prev) => ({ ...prev, [originalName]: trimmed }));
    } else {
      setExerciseRemaps((prev) => {
        const next = { ...prev };
        delete next[originalName];
        return next;
      });
    }
    setEditingExercise(null);
  }

  function cancelEdit() {
    setEditingExercise(null);
  }

  function resetExerciseState() {
    setExerciseRemaps({});
    setEditingExercise(null);
    setEditValue("");
    setExcludedExercises(new Set());
    setExpandedExercises(new Set());
  }

  return {
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
  };
}
