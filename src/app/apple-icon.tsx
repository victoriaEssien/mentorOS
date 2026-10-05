import { ImageResponse } from "next/og";

import { AppMark } from "@/components/brand/app-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own rounded mask, so the tile is full-bleed.
export default function AppleIcon() {
  return new ImageResponse(<AppMark size={size.width} inset={0.22} corner={0} />, size);
}
