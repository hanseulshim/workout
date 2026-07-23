import { ActiveWorkoutScreen } from "@/components/workout/active-workout-screen";
export const metadata = { title: "Active Workout | Workout" };


export default async function ActiveWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActiveWorkoutScreen sessionId={id} />;
}
