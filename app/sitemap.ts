import type { MetadataRoute } from "next";
import profile from "@/data/profile.json";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: profile.site, changeFrequency: "monthly", priority: 1 },
    { url: `${profile.site}/resume`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
