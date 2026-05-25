"use client";

import type { ChangeEventHandler, RefObject } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
}

export function HevyImportUploadCard({ fileInputRef, onFileChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Hevy CSV</CardTitle>
        <CardDescription>
          Export your history from Hevy, then preview matched exercises before importing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label
          htmlFor="hevy-csv"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors hover:border-primary hover:bg-muted/40"
        >
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Choose a Hevy export file</p>
            <p className="text-sm text-muted-foreground">
              Expected headers include title, start_time, exercise_title, set_index, weight_lbs, reps, and duration_seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            CSV only
          </div>
        </label>
        <input
          ref={fileInputRef}
          id="hevy-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={onFileChange}
        />
      </CardContent>
    </Card>
  );
}
