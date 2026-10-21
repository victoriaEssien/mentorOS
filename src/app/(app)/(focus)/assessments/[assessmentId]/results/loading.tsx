import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Results" blocks={["h-32", "h-16", "h-16", "h-16"]} />;
}
