import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton blocks={["h-32", "h-16", "h-48"]} />;
}
