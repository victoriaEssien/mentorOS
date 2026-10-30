import { Skeleton } from "@/components/ui/skeleton";

import { Screen } from "./screen";

/**
 * Loading state for a tab: the real title renders immediately (it is known before any data),
 * with placeholder blocks in the shape of the screen below it. Screens titled by their data
 * (a project's title) leave the title out and get a placeholder bar instead.
 */
export function ScreenSkeleton({
  title,
  blocks = ["h-40", "h-24", "h-24"],
}: {
  title?: string;
  blocks?: string[];
}) {
  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+3.25rem)] pb-5 lg:pt-[4.5rem]">
        {title ? (
          <h1 className="text-display md:text-[2.5rem]">{title}</h1>
        ) : (
          <Skeleton className="h-9 w-56 md:h-11" />
        )}
        <Skeleton className="mt-3 h-4 w-48" />
      </div>
      <div className="flex flex-col gap-3" role="status" aria-label={title ? `Loading ${title}` : "Loading"}>
        {blocks.map((height, index) => (
          <Skeleton key={index} className={`w-full rounded-lg ${height}`} />
        ))}
      </div>
    </Screen>
  );
}
