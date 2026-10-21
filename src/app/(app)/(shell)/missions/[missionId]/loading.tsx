import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton blocks={["h-40", "h-20", "h-56"]} />;
}
