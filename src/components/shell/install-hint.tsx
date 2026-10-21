"use client";

import { Share, SquarePlus } from "lucide-react";
import { useSyncExternalStore } from "react";

import { AlertCard } from "@/components/system/alert-card";
import { Button } from "@/components/ui/button";

/**
 * iPhones never offer to install a web app; the learner has to know about Share, then Add to Home
 * Screen. This says so, once, in a browser tab on iOS, until they install or say not now. Other
 * platforms' browsers offer installing on their own.
 */

const DISMISSED_KEY = "mentoros:install-hint";
const listeners = new Set<() => void>();
let dismissedNow = false;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function shouldShow(): boolean {
  if (dismissedNow) return false;
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS asks for desktop sites and reports a Mac with a touch screen.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!ios || installed) return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === null;
  } catch {
    return true;
  }
}

function dismiss() {
  dismissedNow = true;
  try {
    localStorage.setItem(DISMISSED_KEY, "dismissed");
  } catch {
    // Private browsing: it stays hidden for this visit only.
  }
  listeners.forEach((listener) => listener());
}

export function InstallHint() {
  // Nothing on the server: only the device knows whether it's an iPhone running in a tab.
  const show = useSyncExternalStore(subscribe, shouldShow, () => false);
  if (!show) return null;

  return (
    <AlertCard
      className="mt-8"
      icon={<SquarePlus aria-hidden />}
      tone="neutral"
      title="Put mentorOS on your Home Screen"
      actions={
        <Button variant="secondary" onClick={dismiss}>
          Not now
        </Button>
      }
    >
      Tap <Share className="inline size-4 align-[-2px]" aria-hidden /> Share, then Add to Home Screen. It
      opens full screen like an app, one tap away each day.
    </AlertCard>
  );
}
