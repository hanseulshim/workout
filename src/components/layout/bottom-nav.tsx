"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, ClipboardList, History, TrendingUp, BookOpen, Settings, LogOut, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Workout", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: ClipboardList },
  { href: "/history", label: "History", icon: History },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/exercises", label: "Exercises", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { endWorkout } = useWorkoutStore();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setMenuOpen(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    endWorkout();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="More options menu"
        >
          <div
            className="absolute bottom-16 right-3 bg-popover border rounded-xl shadow-lg p-2 min-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/import"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              Import from Hevy
            </Link>
            <button
              onClick={() => { setMenuOpen(false); handleLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16 px-2 pb-safe">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[52px]",
              menuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
