import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm">This page doesn&apos;t exist or has been moved.</p>
        <Link href="/" className={buttonVariants()}>Go home</Link>
      </div>
    </div>
  );
}
