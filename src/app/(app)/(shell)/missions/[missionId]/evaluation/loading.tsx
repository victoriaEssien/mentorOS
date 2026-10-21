import { ScreenSkeleton } from "@/components/shell/screen-skeleton";

export default function Loading() {
  return <ScreenSkeleton title="Evaluation" blocks={["h-32", "h-56", "h-24"]} />;
}
