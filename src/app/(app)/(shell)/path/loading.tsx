import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Path" blocks={["h-24", "h-20", "h-20", "h-20"]} />;
}
