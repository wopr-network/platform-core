import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://wopr.bot", lastModified: new Date() },
    { url: "https://wopr.bot/pricing", lastModified: new Date() },
    { url: "https://wopr.bot/terms", lastModified: new Date() },
    { url: "https://wopr.bot/privacy", lastModified: new Date() },
  ];
}
