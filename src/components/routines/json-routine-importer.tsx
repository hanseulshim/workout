"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clipboard, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveRoutine } from "@/components/routines/routine-builder-save";
import type { SelectedExercise } from "@/components/routines/routine-builder-types";

interface ParsedSet {
  reps?: string;
  weight?: string;
  duration?: string;
}

interface ParsedExercise {
  name: string;
  notes?: string;
  rest_seconds?: number;
  sets: ParsedSet[];
}

interface ParsedRoutine {
  name: string;
  days?: number[];
  exercises: ParsedExercise[];
}

interface ResolvedExercise extends ParsedExercise {
  exerciseId: string;
  logType: string;
  gifUrl: string | null;
  matched: boolean;
}

interface Props {
  userId: string;
  resolveExercises: (names: string[]) => Promise<ResolvedExercise[]>;
}

const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EXAMPLE_JSON = `{
  "name": "Push Day",
  "days": ["monday", "thursday"],
  "exercises": [
    {
      "name": "Bench Press",
      "rest_seconds": 120,
      "sets": [
        { "weight": "135", "reps": "10" },
        { "weight": "155", "reps": "8" },
        { "weight": "155", "reps": "8" }
      ]
    },
    {
      "name": "Overhead Press",
      "notes": "Keep core tight",
      "sets": [
        { "weight": "95", "reps": "8" },
        { "weight": "95", "reps": "8" }
      ]
    },
    {
      "name": "Plank",
      "sets": [
        { "duration": "60" },
        { "duration": "60" }
      ]
    }
  ]
}`;

const AI_PROMPT = `Please format my workout routine as JSON using this exact structure:

{
  "name": "Routine Name",
  "days": ["monday", "wednesday", "friday"],
  "exercises": [
    {
      "name": "Exercise Name",
      "notes": "optional notes",
      "rest_seconds": 90,
      "sets": [
        { "weight": "135", "reps": "10" },
        { "weight": "135", "reps": "10" }
      ]
    }
  ]
}

Rules:
- "days" is optional; use lowercase day names like "monday", "tuesday", etc.
- For timed exercises use { "duration": "60" } (seconds) instead of weight/reps
- "notes" and "rest_seconds" are optional
- Output ONLY the raw JSON, no markdown fences`;

export function JsonRoutineImporter({ userId, resolveExercises }: Props) {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [resolved, setResolved] = useState<ResolvedExercise[] | null>(null);
  const [parsed, setParsed] = useState<ParsedRoutine | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  async function handleParse() {
    let data: ParsedRoutine;
    try {
      data = JSON.parse(json.trim());
    } catch {
      toast.error("Invalid JSON — check for syntax errors");
      return;
    }

    if (!data.name || !Array.isArray(data.exercises)) {
      toast.error("JSON must have a \"name\" and \"exercises\" array");
      return;
    }

    setResolving(true);
    try {
      const names = data.exercises.map((e) => e.name);
      const results = await resolveExercises(names);
      // merge parsed set data into resolved
      const merged = results.map((r, i) => ({ ...r, ...data.exercises[i] }));
      setParsed(data);
      setResolved(merged);
    } catch (e) {
      toast.error("Failed to resolve exercises");
      console.error(e);
    } finally {
      setResolving(false);
    }
  }

  async function handleCreate() {
    if (!parsed || !resolved) return;
    setSaving(true);
    try {
      const selected: SelectedExercise[] = resolved.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        gifUrl: ex.gifUrl,
        logType: ex.logType as SelectedExercise["logType"],
        notes: ex.notes ?? "",
        restSeconds: ex.rest_seconds ?? 0,
        supersetId: null,
        sets: ex.sets.map((s) => ({
          reps: s.duration ? s.duration : (s.reps ?? ""),
          weight: s.weight ?? undefined,
        })),
      }));

      // Resolve days: accept numbers or day-name strings
      const rawDays = parsed.days ?? [];
      const days: number[] = rawDays.map((d) => {
        if (typeof d === "number") return d;
        return DAY_MAP[String(d).toLowerCase()] ?? -1;
      }).filter((d) => d >= 0);

      const id = await saveRoutine({ name: parsed.name, days, selected, userId });
      toast.success(`Routine "${parsed.name}" created!`);
      router.push(`/routines/${id}`);
    } catch (e) {
      toast.error("Failed to create routine");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }

  const unmatched = resolved?.filter((r) => !r.matched) ?? [];

  return (
    <div className="space-y-4">
      {/* AI prompt helper */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowPrompt((v) => !v)}
          >
            <CardTitle className="text-base">📋 Get AI to format your routine</CardTitle>
            {showPrompt ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showPrompt && (
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Copy this prompt and paste it into ChatGPT or Claude, then describe your routine.
            </p>
            <pre className="rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">{AI_PROMPT}</pre>
            <Button size="sm" variant="outline" onClick={copyPrompt} className="w-full">
              {copiedPrompt ? <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copiedPrompt ? "Copied!" : "Copy prompt"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Example JSON */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowExample((v) => !v)}
          >
            <CardTitle className="text-base">📄 Example JSON format</CardTitle>
            {showExample ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showExample && (
          <CardContent>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{EXAMPLE_JSON}</pre>
          </CardContent>
        )}
      </Card>

      {/* JSON input */}
      {!resolved && (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste your routine JSON here…"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />
          <Button onClick={handleParse} disabled={!json.trim() || resolving} className="w-full">
            {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resolving ? "Matching exercises…" : "Preview Routine"}
          </Button>
        </div>
      )}

      {/* Preview */}
      {resolved && parsed && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-lg">{parsed.name}</p>
                  {parsed.days && parsed.days.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(parsed.days as (string | number)[]).map((d, i) => {
                        const dayNum = typeof d === "number" ? d : (DAY_MAP[String(d).toLowerCase()] ?? -1);
                        return dayNum >= 0 ? (
                          <Badge key={i} variant="secondary" className="text-xs">{DAY_LABELS[dayNum]}</Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <Badge variant="outline">{resolved.length} exercises</Badge>
              </div>
            </CardContent>
          </Card>

          {unmatched.length > 0 && (
            <div className="rounded-md border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                {unmatched.length} exercise{unmatched.length > 1 ? "s" : ""} not found in your library
              </div>
              <ul className="text-xs text-yellow-600 dark:text-yellow-500 list-disc pl-5">
                {unmatched.map((u, i) => <li key={i}>{u.name}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground">They&apos;ll be skipped. You can add them manually after creating.</p>
            </div>
          )}

          <div className="space-y-2">
            {resolved.filter((r) => r.matched).map((ex, i) => (
              <Card key={i} className={!ex.matched ? "opacity-40" : ""}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{ex.name}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">{ex.sets.length} sets</Badge>
                  </div>
                  {ex.notes && <p className="text-xs text-muted-foreground">{ex.notes}</p>}
                  <div className="grid gap-1">
                    {ex.sets.map((s, j) => (
                      <div key={j} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="w-6 text-right">{j + 1}</span>
                        <span>
                          {s.duration ? `${s.duration}s` : [s.weight && `${s.weight} lbs`, s.reps && `${s.reps} reps`].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setResolved(null); setParsed(null); }}>
              Edit JSON
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={saving || resolved.filter((r) => r.matched).length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Creating…" : "Create Routine"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
