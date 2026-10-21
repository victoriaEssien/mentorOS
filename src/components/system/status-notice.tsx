import { AlertCard } from "./alert-card";

/**
 * Stands in for a screen that can't show: something missing, or something broken. A neutral
 * system alert in the middle of the space the screen would fill, saying what happened and the
 * way back. Never blames the learner.
 */
export function StatusNotice({
  icon,
  title,
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center py-12">
      <AlertCard icon={icon} title={title} tone="neutral" actions={actions}>
        {children}
      </AlertCard>
    </div>
  );
}
