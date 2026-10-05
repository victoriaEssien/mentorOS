import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Assessment" blocks={["h-24", "h-48"]} />;
}
