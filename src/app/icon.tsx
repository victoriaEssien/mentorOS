import { ImageResponse } from "next/og";

import { AppMark } from "@/components/brand/app-mark";

const icons = {
  "32": { size: 32, inset: 0.14, corner: 0.22 },
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
  return new ImageResponse(<AppMark size={spec.size} inset={spec.inset} corner={spec.corner} />, {
    width: spec.size,
    height: spec.size,
  });
}
