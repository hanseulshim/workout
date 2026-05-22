import { Dumbbell } from "lucide-react";

export async function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center h-14 px-4">
        <Dumbbell className="h-5 w-5 text-primary mr-2" />
        <span className="font-semibold text-sm">Workout Tracker</span>
      </div>
    </header>
  );
}

