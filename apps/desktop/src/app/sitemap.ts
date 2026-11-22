import type { MetadataRoute } from "next"

const BASE_URL = "https://pos.scalmint.com"

type Entry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const ENTRIES: Entry[] = [
  { path: "/dashboard", changeFrequency: "daily", priority: 1 },
  { path: "/dashboard/billing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/auth", changeFrequency: "monthly", priority: 0.6 },
  { path: "/auth/login", changeFrequency: "monthly", priority: 0.6 },
  { path: "/auth/register", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.3 },
  { path: "/data-deletion", changeFrequency: "yearly", priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return ENTRIES.map((entry) => ({
    url: `${BASE_URL}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
