"use client";

import { Tabs as TabsPrimitive } from "radix-ui";

/**
 * Switches between the learner's tracks. The panels are rendered on the server and passed in;
 * this only decides which one shows. Scrolls sideways when track names don't fit a phone.
 */
export function TrackTabs({
  tracks,
  panels,
}: {
  tracks: { id: string; name: string }[];
  panels: React.ReactNode[];
}) {
  return (
    <TabsPrimitive.Root defaultValue={tracks[0]?.id}>
      <TabsPrimitive.List
        aria-label="Tracks"
        className="-mx-4 mb-5 flex [scrollbar-width:none] gap-0.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <span className="flex gap-0.5 rounded-md bg-muted p-0.5">
          {tracks.map((track) => (
            <TabsPrimitive.Trigger
              key={track.id}
              value={track.id}
              className="h-9 shrink-0 rounded-sm px-3.5 text-footnote font-semibold whitespace-nowrap text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=active]:bg-window data-[state=active]:text-foreground data-[state=active]:shadow-window"
            >
              {track.name}
            </TabsPrimitive.Trigger>
          ))}
        </span>
      </TabsPrimitive.List>
      {tracks.map((track, index) => (
        <TabsPrimitive.Content key={track.id} value={track.id} className="outline-none">
          {panels[index]}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
