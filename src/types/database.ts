export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WeightUnit = "kg" | "lbs";
export type ExerciseCategory = "strength" | "cardio" | "bodyweight" | "stretching" | "other";
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "full_body"
  | "other";

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "bodyweight"
  | "machine"
  | "cable"
  | "ez_bar"
  | "kettlebell"
  | "band"
  | "plate"
  | "other";

export type LogType =
  | "weight_reps"
  | "bodyweight_reps"
  | "weighted_bodyweight"
  | "assisted_bodyweight"
  | "duration";

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle_group: MuscleGroup;
          category: ExerciseCategory;
          equipment_type: EquipmentType;
          log_type: LogType;
          is_custom: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          muscle_group: MuscleGroup;
          category: ExerciseCategory;
          equipment_type?: EquipmentType;
          log_type?: LogType;
          is_custom?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["routines"]["Insert"]>;
      };
      routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          exercise_id: string;
          position: number;
          default_sets: number;
          default_reps: number | null;
          default_weight: number | null;
        };
        Insert: {
          id?: string;
          routine_id: string;
          exercise_id: string;
          position: number;
          default_sets?: number;
          default_reps?: number | null;
          default_weight?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["routine_exercises"]["Insert"]>;
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string | null;
          name: string;
          started_at: string;
          finished_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          routine_id?: string | null;
          name: string;
          started_at?: string;
          finished_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
      };
      workout_sets: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          weight_unit: WeightUnit;
          is_bodyweight: boolean;
          duration_seconds: number | null;
          rest_seconds: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps?: number | null;
          weight?: number | null;
          weight_unit?: WeightUnit;
          is_bodyweight?: boolean;
          duration_seconds?: number | null;
          rest_seconds?: number | null;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      weight_unit: WeightUnit;
      exercise_category: ExerciseCategory;
      muscle_group: MuscleGroup;
      equipment_type: EquipmentType;
      log_type: LogType;
    };
  };
}

// Convenience row types
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
export type RoutineExercise = Database["public"]["Tables"]["routine_exercises"]["Row"];
export type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];
