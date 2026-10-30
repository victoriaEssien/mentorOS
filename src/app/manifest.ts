import type { MetadataRoute } from "next";

/** Installable web app (PWA). Start on Today, the app's home tab. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "mentorOS",
    short_name: "mentorOS",
    description:
      "A technical mentor: a theme a week, a concept a day to explain in your own words, and a project to build.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#eceef1",
    theme_color: "#eceef1",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's session", short_name: "Today", url: "/today" },
      { name: "Ask the mentor", short_name: "Mentor", url: "/mentor" },
    ],
  };
}
