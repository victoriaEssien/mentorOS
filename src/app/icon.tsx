import { ImageResponse } from "next/og";

import { AppMark, SmallAppMark } from "@/components/brand/app-mark";

const icons = {
  // Tabs and bookmarks: the simplified mark, at 1x and 2x.
  "16": { size: 16, small: true },
  "32": { size: 32, small: true },
  "192": { size: 192, inset: 0.2, corner: 0.22 },
  "512": { size: 512, inset: 0.2, corner: 0.22 },
  // Full-bleed with the bars inside the circular safe zone, for Android adaptive icons.
  maskable: { size: 512, inset: 0.27, corner: 0 },
} as const;

type IconId = keyof typeof icons;

export function generateImageMetadata() {
  return (Object.keys(icons) as IconId[]).map((id) => ({
    id,
    contentType: "image/png",
    size: { width: icons[id].size, height: icons[id].size },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const spec = icons[(await id) as IconId] ?? icons["32"];
  const mark =
    "small" in spec ? (
      <SmallAppMark size={spec.size} />
    ) : (
      <AppMark size={spec.size} inset={spec.inset} corner={spec.corner} />
    );
  return new ImageResponse(mark, { width: spec.size, height: spec.size });
}
