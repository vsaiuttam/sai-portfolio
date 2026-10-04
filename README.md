# Sai Uttam Dutt Veeravajhula · Portfolio

Personal site with a Japanese design: kinari cream and ai-zome indigo by day,
an indigo night in dark mode, an ensō brush mark, section names in kanji set
vertically (tategaki), a portrait seen through a round marumado window with a
tanzaku strip (tap the photo, 変身: it crunches into pixels and flips, tile by
tile, into a hand-drawn pixel character of me in a straw hat, who blinks,
breathes and tips the hat; lib/sprite.ts),
and a karesansui zen garden to play in: rake the sand, stamp rings, set and
drag stones, scatter momiji, sweep it clean, light the lantern, tip the
shishi-odoshi, and meet the calico cat that wanders through.

Every transition has sound, synthesised in the browser (lib/sound.ts): mute
it with the header button or M. Press ? for keyboard shortcuts (D theme,
1–5 sections, G garden, R resume, T top). The share card is generated
(app/opengraph-image.tsx) and /llms.txt describes the site for AI crawlers. Moving between pages means passing through a noren curtain that
carries 履歴書 (résumé) or 作品集 (portfolio).

Built with Next.js (App Router), no UI or animation libraries.

## Editing content

Everything on the page comes from `data/`:

| File | What it holds |
| --- | --- |
| `profile.json` | name, title, tagline, email, links, photo |
| `about.json` | about paragraphs and the four headline stats |
| `now.json` | what you're building right now (bump `updated`) |
| `experience.json` | roles, dates and bullet points |
| `projects.json` | featured projects (the first two show wide) |
| `skills.json` | skill groups, certifications, education |

The "From GitHub" shelf is fetched from the GitHub API and refreshes daily on
its own. Hide a repo by adding its name to `HIDDEN` in `lib/github.ts`. Set
`GITHUB_TOKEN` in Vercel only if the API rate limit ever bites.

The photo is `public/sai.webp` (with `sai.jpg` as fallback) and the resume PDF
is `public/Sai-Uttam-Dutt-Veeravajhula-Resume.pdf`.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Deploy

Hosted on Vercel. Import this repo at vercel.com/new (framework: Next.js, no
settings to change), and every push to `main` redeploys.
