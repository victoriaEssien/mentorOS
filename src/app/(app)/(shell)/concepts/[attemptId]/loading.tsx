import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton blocks={["h-28", "h-64", "h-40"]} />;
}
