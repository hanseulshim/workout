"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trophy } from "lucide-react";

interface SetRow {
  id: string;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  weight_unit: string;
  completed_at: string;
  workout_sessions: { started_at: string; user_id: string } | { started_at: string; user_id: string }[] | null;
}

function sessionDate(s: SetRow): string {
  const ws = Array.isArray(s.workout_sessions) ? s.workout_sessions[0] : s.workout_sessions;
  return ws?.started_at ?? s.completed_at;
}

interface Props {
  sets: SetRow[];
}

interface DayData {
  date: string;
  isoDate: string;
  maxWeight: number;
  volume: number;
  maxReps: number;
  maxDuration: number;
  setLabels: string[];
}

function formatSet(s: SetRow): string {
  if (s.duration_seconds) {
    const sec = s.duration_seconds;
    return sec >= 60
      ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
      : `${sec}s`;
  }
  if (s.weight) return `${s.weight} × ${s.reps}`;
  return `${s.reps} reps`;
}

function SetsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DayData }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-2.5 text-xs shadow-md min-w-[120px]">
      <p className="font-semibold mb-1">{d.date}</p>
      {d.setLabels.map((label, i) => (
        <p key={i} className="text-muted-foreground">Set {i + 1}: {label}</p>
      ))}
    </div>
  );
}

export function ProgressCharts({ sets }: Props) {
  if (sets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-12">
        No data yet. Log this exercise to see progress!
      </p>
    );
  }

  // Group by session date — preserve insertion order (sets are ordered by completed_at asc)
  const byDate = new Map<string, DayData>();

  for (const s of sets) {
    const isoDate = sessionDate(s);
    const date = format(new Date(isoDate), "MMM d");
    const weight = s.weight ?? 0;
    const reps = s.reps ?? 0;
    const vol = weight * reps;

    if (!byDate.has(date)) {
      byDate.set(date, { date, isoDate, maxWeight: weight, volume: vol, maxReps: reps, maxDuration: s.duration_seconds ?? 0, setLabels: [formatSet(s)] });
    } else {
      const existing = byDate.get(date)!;
      byDate.set(date, {
        ...existing,
        maxWeight: Math.max(existing.maxWeight, weight),
        volume: existing.volume + vol,
        maxReps: Math.max(existing.maxReps, reps),
        maxDuration: Math.max(existing.maxDuration, s.duration_seconds ?? 0),
        setLabels: [...existing.setLabels, formatSet(s)],
      });
    }
  }

  const data = [...byDate.values()];
  const allTimeMax = Math.max(...data.map((d) => d.maxWeight));
  const allTimeMaxReps = Math.max(...data.map((d) => d.maxReps));
  const allTimeMaxDuration = Math.max(...data.map((d) => d.maxDuration));

  function formatDuration(sec: number) {
    return sec >= 60
      ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
      : `${sec}s`;
  }
  const hasWeight = sets.some((s) => s.weight);
  const hasDuration = !hasWeight && sets.some((s) => s.duration_seconds);

  const chartColor = "hsl(var(--primary))";

  return (
    <div className="space-y-4">
      {/* PR Badge */}
      <div className="flex gap-2 flex-wrap">
        <Badge className="flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          {hasWeight
            ? `Best: ${allTimeMax} lbs × ${allTimeMaxReps} reps`
            : hasDuration
              ? `Best hold: ${formatDuration(allTimeMaxDuration)}`
              : `Best: ${allTimeMaxReps} reps`}
        </Badge>
      </div>

      {/* Max Weight Over Time */}
      {hasWeight && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Weight per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<SetsTooltip />} />
                <Line type="monotone" dataKey="maxWeight" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Volume Over Time */}
      {hasWeight && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Volume per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<SetsTooltip />} />
                <Line type="monotone" dataKey="volume" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Reps Over Time (bodyweight) */}
      {!hasWeight && !hasDuration && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Reps per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<SetsTooltip />} />
                <Line type="monotone" dataKey="maxReps" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Duration Over Time */}
      {hasDuration && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Hold Duration per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatDuration} width={36} />
                <Tooltip content={<SetsTooltip />} />
                <Line type="monotone" dataKey="maxDuration" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Session History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...data].reverse().map((d) => (
            <div key={d.isoDate} className="flex items-start justify-between gap-4">
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5 w-14">{d.date}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 flex-1">
                {d.setLabels.map((label, i) => (
                  <span key={i} className="text-xs">
                    <span className="text-muted-foreground">S{i + 1}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
