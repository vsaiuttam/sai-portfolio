import type { MetadataRoute } from "next";
import profile from "@/data/profile.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${profile.name} · AI Engineer`,
    short_name: profile.shortName,
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#c53a24",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
