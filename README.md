# Sai Uttam Dutt Veeravajhula · Portfolio

Personal site: an Indian twist on a Japanese washi-paper look. Sindoor red and
indigo on paper by day, diya gold on sumi ink by night, a साई hanko seal, section
names in Devanagari set vertically like tategaki, and a lotus pond in the hero
that follows the six Indian seasons (ṛtu): marigold petals in Vasanta, sun glints
in Grishma, monsoon rain in Varsha, fireflies in Sharad, floating diyas in
Hemanta, mist and leaves in Shishira. Touch the water to make ripples; the button
in the footer cycles the seasons.

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
