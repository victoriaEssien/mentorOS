import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Settings" blocks={["h-28", "h-56", "h-14"]} />;
}
