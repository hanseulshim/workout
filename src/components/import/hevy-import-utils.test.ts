import { describe, expect, test } from "bun:test";
import {
  buildPreviewData,
  buildRoutineExerciseRows,
  inferLogType,
  inferMuscleGroup,
  normalizeName,
  parseCSV,
  parseHevyDate,
} from "./hevy-import-utils";
import type { HevyRow } from "./hevy-import-types";

const HEADERS =
  "title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe";

describe("hevy-import-utils", () => {
  test("normalizeName strips equipment qualifiers, hyphens, and extra whitespace", () => {
    expect(normalizeName("  Bench Press (Barbell)  ")).toBe("bench press");
    expect(normalizeName("Pull-Up (Band)")).toBe("pull up");
    expect(normalizeName("Lat Pulldown   (Cable)")).toBe("lat pulldown");
  });

  test("inferMuscleGroup matches hamstring rules before generic deadlift", () => {
    expect(inferMuscleGroup("Romanian Deadlift (Barbell)")).toEqual({
      muscle_group: "hamstrings",
      category: "strength",
    });
    expect(inferMuscleGroup("Deadlift (Barbell)")).toEqual({
      muscle_group: "back",
      category: "strength",
    });
    expect(inferMuscleGroup("Mystery Movement")).toEqual({
      muscle_group: "other",
      category: "other",
    });
  });

  test("parseCSV strips BOM, handles quoted commas, validates headers, and reports skipped rows", () => {
    const csv = [
      `\uFEFF${HEADERS}`,
      `"Push Day","15 Mar 2025, 09:00","15 Mar 2025, 10:00","","Bench Press (Barbell)","","Paused, strict",0,normal,185,8,,,`,
      `"Push Day","","15 Mar 2025, 10:00","","Bench Press (Barbell)","","",1,normal,185,8,,,`,
    ].join("\n");

    const { rows, warnings } = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].exercise_notes).toBe("Paused, strict");
    expect(warnings).toEqual(["1 row skipped: missing start_time"]);
  });

  test("parseCSV throws when a required header is missing", () => {
    expect(() => parseCSV("title,start_time\nPush,15 Mar 2025, 09:00")).toThrow(
      "Missing required header",
    );
  });

  test("parseHevyDate parses valid timestamps and rejects invalid ones", () => {
    const iso = parseHevyDate("15 Mar 2025, 09:30");
    expect(iso).toMatch(/^2025-03-15T/);
    expect(() => parseHevyDate("not-a-date")).toThrow("Invalid Hevy date");
  });

  test("inferLogType distinguishes duration, bodyweight, weighted bodyweight, and weight_reps", () => {
    const base: HevyRow = {
      title: "Test",
      start_time: "15 Mar 2025, 09:00",
      end_time: "15 Mar 2025, 10:00",
      description: "",
      exercise_title: "Plank",
      superset_id: "",
      exercise_notes: "",
      set_index: "0",
      set_type: "normal",
      weight_lbs: "",
      reps: "",
      distance_miles: "",
      duration_seconds: "60",
      rpe: "",
    };

    expect(inferLogType(base)).toBe("duration");
    expect(inferLogType({ ...base, duration_seconds: "", reps: "10" })).toBe("bodyweight_reps");
    expect(
      inferLogType({
        ...base,
        exercise_title: "Dip (Weighted)",
        duration_seconds: "",
        weight_lbs: "25",
        reps: "8",
      }),
    ).toBe("weighted_bodyweight");
    expect(
      inferLogType({
        ...base,
        exercise_title: "Bench Press",
        duration_seconds: "",
        weight_lbs: "185",
        reps: "5",
      }),
    ).toBe("weight_reps");
  });

  test("buildPreviewData and buildRoutineExerciseRows preserve supersets only for multi-exercise groups", () => {
    const csv = [
      HEADERS,
      `"Upper","15 Mar 2025, 09:00","15 Mar 2025, 10:00","","Bench Press (Barbell)",1,"",1,normal,185,6,,,`,
      `"Upper","15 Mar 2025, 09:00","15 Mar 2025, 10:00","","Bench Press (Barbell)",1,"",0,normal,175,8,,,`,
      `"Upper","15 Mar 2025, 09:00","15 Mar 2025, 10:00","","Barbell Row",1,"",0,normal,135,10,,,`,
      `"Upper","15 Mar 2025, 09:00","15 Mar 2025, 10:00","","Plank",2,"",0,normal,,, ,60,`,
    ].join("\n");

    const { rows } = parseCSV(csv);
    const preview = buildPreviewData(
      rows,
      [{ id: "id-bench", name: "Bench Press", log_type: "weight_reps", gif_url: null }],
      "hevy.csv",
    );

    expect(preview.sessions).toHaveLength(1);
    expect(preview.routines).toEqual(["Upper"]);
    expect(preview.exercises.find((e) => e.name === "Bench Press (Barbell)")?.matched).toBe(true);

    const routineRows = buildRoutineExerciseRows(
      rows,
      new Map([
        ["bench press", "id-bench"],
        ["barbell row", "id-row"],
        ["plank", "id-plank"],
      ]),
    );

    expect(routineRows).toHaveLength(3);
    // Bench sets sorted by set_index 0 then 1
    expect(routineRows[0].set_targets).toEqual([
      { reps: "8", weight: "175" },
      { reps: "6", weight: "185" },
    ]);
    // Bench and Row share superset_id; lone Plank gets null
    expect(routineRows[0].superset_id).not.toBeNull();
    expect(routineRows[0].superset_id).toBe(routineRows[1].superset_id);
    expect(routineRows[2].superset_id).toBeNull();
  });
});
