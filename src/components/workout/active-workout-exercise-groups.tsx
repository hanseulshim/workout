"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ActiveWorkoutExerciseCard } from "@/components/workout/active-workout-exercise-card";
import { SupersetGroup, SupersetLinkButton } from "@/components/workout/exercise-editor-card";
import type { ActiveExercise, ActiveSet } from "@/store/workout-store";

type ExerciseGroup =
  | { type: "single"; ex: ActiveExercise }
  | { type: "superset"; supersetId: string; exercises: ActiveExercise[] };

interface ActiveWorkoutExerciseGroupsProps {
  exercises: ActiveExercise[];
  invalidSetIds: Set<string>;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  onToggleComplete: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onSetRestTime: (exerciseId: string, seconds: number) => void;
  onStartRest: (exerciseId: string, seconds: number) => void;
  onSetNotes: (exerciseId: string, notes: string) => void;
  onLinkSuperset: (exerciseId1: string, exerciseId2: string) => void;
  onUnlinkSuperset: (exerciseId: string) => void;
  onReorderExercises: (orderedIds: string[]) => void;
}

function buildGroups(exercises: ActiveExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const seenSupersets = new Set<string>();

  for (const exercise of exercises) {
    if (!exercise.supersetId) {
      groups.push({ type: "single", ex: exercise });
      continue;
    }

    if (seenSupersets.has(exercise.supersetId)) {
      continue;
    }

    const members = exercises.filter((item) => item.supersetId === exercise.supersetId);
    seenSupersets.add(exercise.supersetId);

    if (members.length <= 1) {
      groups.push({ type: "single", ex: exercise });
    } else {
      groups.push({ type: "superset", supersetId: exercise.supersetId, exercises: members });
    }
  }

  return groups;
}

export function ActiveWorkoutExerciseGroups({
  exercises,
  invalidSetIds,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleComplete,
  onRemoveExercise,
  onSetRestTime,
  onStartRest,
  onSetNotes,
  onLinkSuperset,
  onUnlinkSuperset,
  onReorderExercises,
}: ActiveWorkoutExerciseGroupsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const groups = buildGroups(exercises);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = exercises.map((exercise) => exercise.exerciseId);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorderExercises(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={exercises.map((exercise) => exercise.exerciseId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {groups.map((group, index) => (
            <div key={group.type === "single" ? group.ex.exerciseId : group.supersetId}>
              {group.type === "single" ? (
                <div className="space-y-1">
                  <ActiveWorkoutExerciseCard
                    exercise={group.ex}
                    invalidSetIds={invalidSetIds}
                    onAddSet={() => onAddSet(group.ex.exerciseId)}
                    onRemoveSet={(setId) => onRemoveSet(group.ex.exerciseId, setId)}
                    onUpdateSet={(setId, updates) => onUpdateSet(group.ex.exerciseId, setId, updates)}
                    onToggleComplete={(setId) => onToggleComplete(group.ex.exerciseId, setId)}
                    onRemoveExercise={() => onRemoveExercise(group.ex.exerciseId)}
                    onSetRestTime={(seconds) => onSetRestTime(group.ex.exerciseId, seconds)}
                    onStartRest={(seconds) => onStartRest(group.ex.exerciseId, seconds)}
                    onSetNotes={(notes) => onSetNotes(group.ex.exerciseId, notes)}
                  />
                  {index < groups.length - 1 && (
                    <SupersetLinkButton
                      extending={groups[index + 1].type === "superset"}
                      onClick={() => {
                        const nextGroup = groups[index + 1];
                        const nextId = nextGroup.type === "single"
                          ? nextGroup.ex.exerciseId
                          : nextGroup.exercises[0].exerciseId;
                        onLinkSuperset(group.ex.exerciseId, nextId);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <SupersetGroup>
                    {group.exercises.map((exercise) => (
                      <ActiveWorkoutExerciseCard
                        key={exercise.exerciseId}
                        exercise={exercise}
                        invalidSetIds={invalidSetIds}
                        onAddSet={() => onAddSet(exercise.exerciseId)}
                        onRemoveSet={(setId) => onRemoveSet(exercise.exerciseId, setId)}
                        onUpdateSet={(setId, updates) => onUpdateSet(exercise.exerciseId, setId, updates)}
                        onToggleComplete={(setId) => onToggleComplete(exercise.exerciseId, setId)}
                        onRemoveExercise={() => onRemoveExercise(exercise.exerciseId)}
                        onSetRestTime={(seconds) => onSetRestTime(exercise.exerciseId, seconds)}
                        onStartRest={(seconds) => onStartRest(exercise.exerciseId, seconds)}
                        onSetNotes={(notes) => onSetNotes(exercise.exerciseId, notes)}
                        onUnlinkSuperset={() => onUnlinkSuperset(exercise.exerciseId)}
                      />
                    ))}
                  </SupersetGroup>
                  {index < groups.length - 1 && (
                    <SupersetLinkButton
                      extending
                      onClick={() => {
                        const nextGroup = groups[index + 1];
                        const nextId = nextGroup.type === "single"
                          ? nextGroup.ex.exerciseId
                          : nextGroup.exercises[0].exerciseId;
                        const lastExercise = group.exercises[group.exercises.length - 1].exerciseId;
                        onLinkSuperset(lastExercise, nextId);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
