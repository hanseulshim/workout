import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ActiveWorkoutBanner } from "@/components/workout/active-workout-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-56 flex flex-col min-h-screen">
        <Header />
        <ActiveWorkoutBanner />
        <PwaInstallPrompt />
        <main className="flex-1 px-4 pt-4 pb-24 md:pb-8 md:px-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

