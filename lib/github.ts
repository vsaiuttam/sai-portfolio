import type { Repo } from "./types";

// Repos that are profile scaffolding or already featured by hand.
const HIDDEN = new Set(["vsaiuttam", "x", "project-", "caller-agent", "portfolio"]);

const pretty = (name: string) =>
  name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());

/**
 * Public, non-fork repos for the "From GitHub" shelf. Refreshed at most once
 * a day (ISR), so a new repo shows up without a redeploy. A failed fetch
 * renders an empty shelf rather than breaking the page.
 */
export async function getRepos(user: string): Promise<Repo[]> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`, {
      headers,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{
      name: string;
      description: string | null;
      html_url: string;
      homepage: string | null;
      language: string | null;
      stargazers_count: number;
      pushed_at: string;
      fork: boolean;
      archived: boolean;
    }>;
    return raw
      .filter((r) => !r.fork && !r.archived && !HIDDEN.has(r.name))
      .map((r) => ({
        name: pretty(r.name),
        description: (r.description ?? "").trim(),
        url: r.html_url,
        homepage: r.homepage?.trim() || undefined,
        language: r.language ?? undefined,
        stars: r.stargazers_count,
        updated: r.pushed_at,
      }))
      // Live demos and described repos first, then stars, then recency.
      .sort(
        (a, b) =>
          Number(!!b.homepage) - Number(!!a.homepage) ||
          Number(!!b.description) - Number(!!a.description) ||
          b.stars - a.stars ||
          b.updated.localeCompare(a.updated),
      );
  } catch {
    return [];
  }
}

export const LANG_COLOURS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#e0b521",
  Python: "#3572a5",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  CSS: "#663399",
  Go: "#00add8",
};
