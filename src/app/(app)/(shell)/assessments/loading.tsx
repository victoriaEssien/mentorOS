import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Assessments" blocks={["h-24", "h-24"]} />;
}
