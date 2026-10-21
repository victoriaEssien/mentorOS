import { ViewTransition } from "react";

/**
 * Directional navigation, the way native apps move: drilling into something slides the new screen
 * in from the right, going back slides it in from the left. Everything untagged (tab switches,
 * the browser's own back, refreshes, Suspense reveals) swaps instantly. Tag a Link with
 * `transitionTypes={NAV_FORWARD}` or `NAV_BACK`; the slides themselves live in globals.css.
 */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

const SLIDES = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/** Wraps one page's content. It has to sit in the page, not a layout: layouts persist, so they never enter or exit. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={SLIDES} exit={SLIDES} default="none">
      {children}
    </ViewTransition>
  );
}
