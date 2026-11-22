"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  showLabel?: boolean;
  className?: string;
}

export function LogoutButton({ showLabel = false, className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
      setLoading(false);
      return;
    }
    useWorkoutStore.getState().endWorkout();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={handleLogout}
      disabled={loading}
      aria-label={showLabel ? undefined : "Sign out"}
      className={cn(
        showLabel && "w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {showLabel && <span>{loading ? "Signing out..." : "Sign out"}</span>}
    </Button>
  );
}
