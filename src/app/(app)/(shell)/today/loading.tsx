import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Today" blocks={["h-44", "h-28", "h-24"]} />;
}
