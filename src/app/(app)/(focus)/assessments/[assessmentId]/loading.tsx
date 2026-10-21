import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like the player: progress bar, question, four answer rows, footer buttons. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" role="status" aria-label="Loading the assessment">
      <div className="pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-2">
          <span className="size-11 shrink-0" />
          <Skeleton className="h-1.5 flex-1 rounded-xs" />
          <span className="w-12" />
          <span className="size-11 shrink-0" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-3">
        <Skeleton className="h-6 w-24 rounded-sm" />
        <Skeleton className="mt-5 h-5 w-full" />
        <Skeleton className="mt-2.5 h-5 w-3/4" />
        <div className="mt-8 flex flex-col gap-2.5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-window pb-safe">
        <div className="mx-auto flex w-full max-w-2xl gap-2.5 px-4 py-3">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    </div>
  );
}
