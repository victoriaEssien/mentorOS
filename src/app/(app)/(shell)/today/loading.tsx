import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

// The title is a greeting from the learner's data, so the skeleton shows a bar in its place.
export default function Loading() {
  return <ScreenSkeleton blocks={["h-40", "h-32", "h-28", "h-44"]} />;
}
