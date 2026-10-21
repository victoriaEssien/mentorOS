import { Pip } from "@/components/brand/pip";
import { CellMeter } from "@/components/system/cell-meter";

/**
 * Full-screen wait for model work the learner has to sit through (writing a diagnostic, grading
 * one). Pip thinks while the meter fills on a loop, and the copy says what is happening and roughly
 * how long it takes.
 */
export function WorkingScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe" role="status">
      <div className="w-full max-w-sm">
        <Pip mood="thinking" size={96} className="-ml-2" />
        <CellMeter
          value={1}
          label={title}
          animate
          className="mt-6 [&>span]:h-4 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
        />
        <h1 className="mt-8 text-title">{title}</h1>
        <p className="mt-2 text-callout text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
