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
  weight_unit: string;
  completed_at: string;
  workout_sessions: { started_at: string } | null;
}

interface Props {
  sets: SetRow[];
}

export function ProgressCharts({ sets }: Props) {
  if (sets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-12">
        No data yet. Log this exercise to see progress!
      </p>
    );
  }

  // Build daily max weight and total volume
  const byDate = new Map<
    string,
    { date: string; maxWeight: number; volume: number; maxReps: number }
  >();

  for (const s of sets) {
    const date = format(
      new Date((s.workout_sessions?.started_at ?? s.completed_at)),
      "MMM d"
    );
    const weight = s.weight ?? 0;
    const reps = s.reps ?? 0;
    const vol = weight * reps;

    if (!byDate.has(date)) {
      byDate.set(date, { date, maxWeight: weight, volume: vol, maxReps: reps });
    } else {
      const existing = byDate.get(date)!;
      byDate.set(date, {
        date,
        maxWeight: Math.max(existing.maxWeight, weight),
        volume: existing.volume + vol,
        maxReps: Math.max(existing.maxReps, reps),
      });
    }
  }

  const data = [...byDate.values()];
  const allTimeMax = Math.max(...data.map((d) => d.maxWeight));
  const allTimeMaxReps = Math.max(...data.map((d) => d.maxReps));

  const chartColor = "hsl(var(--primary))";

  return (
    <div className="space-y-4">
      {/* PR Badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge className="flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          Best: {allTimeMax} lbs × {allTimeMaxReps} reps
        </Badge>
      </div>

      {/* Max Weight Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Max Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(val: unknown) => [`${val} lbs`, "Max Weight"]}
              />
              <Line type="monotone" dataKey="maxWeight" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Volume (weight × reps)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(val: unknown) => [`${Number(val).toLocaleString()} lbs`, "Volume"]}
              />
              <Line type="monotone" dataKey="volume" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
