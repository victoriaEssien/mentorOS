import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Mentor" blocks={["h-20", "h-20", "h-32"]} />;
}
