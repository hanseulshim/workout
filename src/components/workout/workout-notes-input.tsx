"use client";

interface WorkoutNotesInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function WorkoutNotesInput({ value, onChange }: WorkoutNotesInputProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Notes (carries over next session)"
      rows={1}
      className="mt-1 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      style={{ minHeight: "2.25rem" }}
      onInput={(event) => {
        const target = event.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      }}
    />
  );
}
