import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
