"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportResult } from "./hevy-import-types";

interface Props {
  fileName: string;
  result: ImportResult;
  onReset: () => void;
}

export function HevyImportSummaryCard({ fileName, result, onReset }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import complete</CardTitle>
          <CardDescription>{fileName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SummaryRow label="Sessions imported" value={result.importedSessions.toString()} />
          <SummaryRow label="Duplicate sessions skipped" value={result.skippedSessions.toString()} />
          <SummaryRow label="Sessions rolled back" value={result.failedSessions.toString()} />
          <SummaryRow label="Exercises created" value={result.createdExercises.toString()} />
          <SummaryRow label="Routines created" value={result.createdRoutines.toString()} />
          <Button onClick={onReset} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Import another file
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
