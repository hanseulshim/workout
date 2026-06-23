"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WorkoutNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function WorkoutNotesInput({
  value,
  onChange,
  placeholder = "Notes (carries over next session)",
  className,
}: WorkoutNotesInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "mt-1 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
        className
      )}
      style={{ minHeight: "2.25rem" }}
    />
  );
}
