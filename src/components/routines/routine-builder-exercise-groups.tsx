"use client";

import { SupersetLinkButton, SupersetGroup } from "@/components/workout/exercise-editor-card";
import type { SelectedExercise, SetTarget } from "./routine-builder-types";
import { RoutineExerciseCard } from "./routine-exercise-card";

type ExerciseGroup =
  | { type: "single"; ex: SelectedExercise }
  | { type: "superset"; supersetId: string; exercises: SelectedExercise[]; colorIndex: number };

function buildGroups(exercises: SelectedExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const seenSupersets = new Set<string>();
  let supersetCount = 0;

  for (const ex of exercises) {
    if (!ex.supersetId) {
      groups.push({ type: "single", ex });
      continue;
    }

    if (seenSupersets.has(ex.supersetId)) {
      continue;
    }

    const members = exercises.filter((item) => item.supersetId === ex.supersetId);
    seenSupersets.add(ex.supersetId);

    if (members.length <= 1) {
      groups.push({ type: "single", ex });
    } else {
      groups.push({ type: "superset", supersetId: ex.supersetId, exercises: members, colorIndex: supersetCount++ });
    }
  }

  return groups;
}

interface Props {
  selected: SelectedExercise[];
  onUpdate: (exIdx: number, setIdx: number, updates: Partial<SetTarget>) => void;
  onAddSet: (id: string) => void;
  onRemoveSet: (id: string, setIdx: number) => void;
  onRemove: (id: string) => void;
  onLinkSuperset: (id1: string, id2: string) => void;
  onUnlink: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateRestSeconds: (id: string, seconds: number) => void;
}

export function RoutineBuilderExerciseGroups({
  selected,
  onUpdate,
  onAddSet,
  onRemoveSet,
  onRemove,
  onLinkSuperset,
  onUnlink,
  onUpdateNotes,
  onUpdateRestSeconds,
}: Props) {
  const groups = buildGroups(selected);
  const exerciseIndices = new Map(selected.map((exercise, index) => [exercise.exerciseId, index]));
  const getExerciseIndex = (exerciseId: string) => exerciseIndices.get(exerciseId) ?? -1;

  return (
    <div className="space-y-2">
      {groups.map((group, groupIndex) => {
        const nextGroup = groups[groupIndex + 1];
        const nextExerciseId = nextGroup
          ? nextGroup.type === "single"
            ? nextGroup.ex.exerciseId
            : nextGroup.exercises[0].exerciseId
          : null;

        return (
          <div key={group.type === "single" ? group.ex.exerciseId : group.supersetId}>
            {group.type === "single" ? (
              <div className="space-y-1">
                <RoutineExerciseCard
                  ex={group.ex}
                  exIdx={getExerciseIndex(group.ex.exerciseId)}
                  onUpdate={onUpdate}
                  onAddSet={onAddSet}
                  onRemoveSet={onRemoveSet}
                  onRemove={onRemove}
                  onUnlink={onUnlink}
                  onUpdateNotes={onUpdateNotes}
                  onUpdateRestSeconds={onUpdateRestSeconds}
                />
                {nextExerciseId && (
                  <SupersetLinkButton
                    extending={nextGroup.type === "superset"}
                    onClick={() => onLinkSuperset(group.ex.exerciseId, nextExerciseId)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <SupersetGroup colorIndex={group.colorIndex}>
                  {group.exercises.map((exercise) => (
                    <RoutineExerciseCard
                      key={exercise.exerciseId}
                      ex={exercise}
                      exIdx={getExerciseIndex(exercise.exerciseId)}
                      onUpdate={onUpdate}
                      onAddSet={onAddSet}
                      onRemoveSet={onRemoveSet}
                      onRemove={onRemove}
                      onUnlink={onUnlink}
                      onUpdateNotes={onUpdateNotes}
                      onUpdateRestSeconds={onUpdateRestSeconds}
                    />
                  ))}
                </SupersetGroup>
                {nextExerciseId && (
                  <SupersetLinkButton
                    extending
                    onClick={() => onLinkSuperset(group.exercises[group.exercises.length - 1].exerciseId, nextExerciseId)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
