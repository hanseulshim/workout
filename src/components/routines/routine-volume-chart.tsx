"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  volume: number;
  reps: number;
}

interface Props {
  data: DataPoint[];
}

type Metric = "volume" | "reps";

export function RoutineVolumeChart({ data }: Props) {
  const [metric, setMetric] = useState<Metric>("volume");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["volume", "reps"] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              metric === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {m === "volume" ? "Volume (lbs)" : "Total Reps"}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) =>
              metric === "volume" ? [`${value.toLocaleString()} lbs`, "Volume"] : [value, "Reps"]
            }
          />
          <Line
            type="monotone"
            dataKey={metric}
            strokeWidth={2}
            dot={{ r: 3 }}
            className="stroke-primary"
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
