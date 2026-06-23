"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ActiveWorkoutBanner } from "@/components/workout/active-workout-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // The active workout page is /workout/[id], but not /workout/start
  const isActiveWorkoutPage = pathname.startsWith("/workout/") && pathname !== "/workout/start";

  return (
    <div className="h-dvh">
      <Sidebar />
      <div className="flex h-dvh flex-col md:pl-56">
        {!isActiveWorkoutPage && <Header />}
        {!isActiveWorkoutPage && <ActiveWorkoutBanner />}
        <PwaInstallPrompt />
        <main
          className={
            isActiveWorkoutPage
              ? "flex-1 overflow-y-auto pb-8"
              : "flex-1 overflow-y-auto px-4 pt-4 pb-24 md:pb-8 md:px-8"
          }
        >
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
        {!isActiveWorkoutPage && <BottomNav />}
      </div>
    </div>
  );
}
