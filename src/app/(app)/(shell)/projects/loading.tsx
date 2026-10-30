import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Projects" blocks={["h-40", "h-28", "h-20"]} />;
}
