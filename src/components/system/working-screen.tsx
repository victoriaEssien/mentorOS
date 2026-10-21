import { LoaderCircle } from "lucide-react";

import { CellMeter } from "@/components/system/cell-meter";

/**
 * Full-screen wait for model work the learner has to sit through (writing a diagnostic, grading
 * one). Says what is happening and roughly how long it takes, with the meter filling on a loop.
 */
export function WorkingScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe" role="status">
      <div className="w-full max-w-sm">
        <CellMeter
          value={1}
          label={title}
          animate
          className="[&>span]:h-4 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
        />
        <h1 className="mt-8 text-title">{title}</h1>
        <p className="mt-2 text-callout text-muted-foreground">{children}</p>
        <p className="mt-6 flex items-center gap-2 text-footnote text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Working
        </p>
      </div>
    </div>
  );
}
