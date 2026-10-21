import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="You" blocks={["h-24", "h-20", "h-20", "h-20"]} />;
}
