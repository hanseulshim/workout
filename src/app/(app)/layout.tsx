import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ActiveWorkoutBanner } from "@/components/workout/active-workout-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh">
      <Sidebar />
      <div className="flex h-dvh flex-col md:pl-56">
        <Header />
        <ActiveWorkoutBanner />
        <PwaInstallPrompt />
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 md:pb-8 md:px-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

