"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportRoutineToJSON, downloadJSON, type RoutineExerciseRowLike } from "@/lib/routines/export-routine";
import { useState } from "react";

interface RoutineExportButtonProps {
  routineName: string;
  days: number[];
  exercises: RoutineExerciseRowLike[];
}

export function RoutineExportButton({ routineName, days, exercises }: RoutineExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    try {
      setIsExporting(true);
      const json = exportRoutineToJSON(routineName, days, exercises);
      const filename = `${routineName.toLowerCase().replace(/\s+/g, "-")}-routine.json`;
      downloadJSON(json, filename);
      toast.success("Routine exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export routine");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5 mr-1.5" />
      )}
      {isExporting ? "Exporting..." : "Export"}
    </Button>
  );
}
