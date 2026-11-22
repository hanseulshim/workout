import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function WorkoutDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-48" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-32 rounded-full" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-1">
                  <Skeleton className="h-3 w-6 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                </div>
                {[1, 2, 3].map((setIdx) => (
                  <div key={setIdx} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                    <Skeleton className="h-4 w-4 mx-auto" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
