"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function HistoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} heading="Failed to load history" />;
}
