"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, GripVertical, Link2, Link2Off, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  name: string;
  gifUrl: string | null;
  supersetId: string | null;
  setsCount: number;
  completedCount?: number; // active mode only
  onRemove: () => void;
  onUnlinkSuperset?: () => void;
  children: React.ReactNode;        // set rows
  footer?: React.ReactNode;          // add-set / rest buttons
}

export function ExerciseEditorCard({
  id,
  name,
  gifUrl,
  supersetId,
  setsCount,
  completedCount,
  onRemove,
  onUnlinkSuperset,
  children,
  footer,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50 z-50")}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing p-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Collapse toggle + name */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                  collapsed && "-rotate-90"
                )}
              />
              {gifUrl && (
                <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-muted">
                  <Image
                    src={gifUrl}
                    alt={name}
                    width={32}
                    height={32}
                    unoptimized
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <CardTitle className="text-base truncate">{name}</CardTitle>
              {completedCount !== undefined && completedCount > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {completedCount}/{setsCount}
                </Badge>
              )}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {supersetId && onUnlinkSuperset && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onUnlinkSuperset}
                  title="Remove from superset"
                >
                  <Link2Off className="h-3.5 w-3.5 text-orange-400" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!collapsed && (
          <CardContent className="space-y-2 pt-0">
            {children}
            {footer && <div className="pt-1">{footer}</div>}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/** Button shown between adjacent exercise groups to link as superset */
export function SupersetLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-orange-400 transition-colors"
    >
      <Link2 className="h-3 w-3" />
      Link as Superset
    </button>
  );
}

/** Colored left-border wrapper for superset groups */
export function SupersetGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-3 border-l-2 border-orange-400 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Badge className="text-xs bg-orange-400 text-white">Superset</Badge>
      </div>
      {children}
    </div>
  );
}
