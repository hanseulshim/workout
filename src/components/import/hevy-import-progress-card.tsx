"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ImportProgressState } from "./hevy-import-types";

interface Props {
  fileName: string;
  progress: ImportProgressState;
}

export function HevyImportProgressCard({ fileName, progress }: Props) {
  const progressValue = progress.total === 0 ? 0 : (progress.completed / progress.total) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Importing Hevy data
        </CardTitle>
        <CardDescription>{progress.currentSession || fileName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progressValue} className="h-2" />
        <p className="text-right text-sm text-muted-foreground">
          {progress.completed}/{progress.total} sessions imported
        </p>
      </CardContent>
    </Card>
  );
}
