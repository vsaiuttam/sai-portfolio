import profile from "@/data/profile.json";
import about from "@/data/about.json";
import now from "@/data/now.json";
import experienceData from "@/data/experience.json";
import projectsData from "@/data/projects.json";
import skillsData from "@/data/skills.json";
import type { Experience, Project, Skills } from "@/lib/types";
import { getRepos, LANG_COLOURS } from "@/lib/github";
import { BrushBreak, Panel, Tanzaku } from "@/components/ui";
import { CopyEmail, FlipText } from "@/components/client";
import Garden from "@/components/garden";
import { IconArrow, IconBriefcase, IconFile, IconGithub, IconLinkedin, IconMail, IconPin, IconStar } from "@/components/icons";

// The GitHub shelf refreshes daily without a redeploy.
export const revalidate = 86400;

const experience = experienceData as Experience[];
const projects = projectsData as Project[];
const skills = skillsData as Skills;

const rise = (i: number) => ({ "data-rise": "", style: { animationDelay: `${70 * i}ms` } });
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default async function Home() {
  const repos = (await getRepos(profile.githubUsername)).slice(0, 9);
  const given = profile.name.split(" ");
  const family = given.pop();

  return (
    <main id="main" className="wrap">
      {/* ---------- Hero ---------- */}
      <section className="hero" aria-label="Introduction">
        <div>
          <p className="label" {...rise(0)}>
            Hajimemashite · はじめまして
          </p>
          <h1 {...rise(1)}>
            {given.join(" ")}
            <span className="surname">{family}</span>
          </h1>
          <p className="title" {...rise(2)}>
            <strong>{profile.title}</strong> at {profile.company} · <FlipText words={profile.roles} />
          </p>
          <p className="tagline" {...rise(3)}>
            {profile.tagline}
          </p>
          <ul className="facts" {...rise(4)}>
            <li>
              <span className="ico">
                <IconBriefcase />
              </span>
              <span>{profile.company}</span>
            </li>
            <li>
              <span className="ico">
                <IconPin />
              </span>
              <span>{profile.location}</span>
            </li>
            <li>
              <span className="ico">
                <IconMail />
              </span>
              <a className="link-line" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
            </li>
            <li>
              <span className="ico">
                <IconGithub />
              </span>
              <a className="link-line" href={profile.links.github} {...ext}>
                {bare(profile.links.github)}
              </a>
            </li>
          </ul>
          <div className="cta" {...rise(5)}>
            <a className="btn primary" href="#contact">
              <IconMail /> Get in touch
            </a>
            <a className="btn" href="/resume">
              <IconFile /> Resume
            </a>
            <a className="btn" href={profile.links.linkedin} {...ext} aria-label="LinkedIn profile">
              <IconLinkedin /> LinkedIn
            </a>
          </div>
        </div>
        <div className="portrait" {...rise(2)}>
          <span className="ring" aria-hidden="true" />
          <div className="marumado">
            <picture>
              <source srcSet={profile.photo} type="image/webp" />
              <img src={profile.photoFallback} alt={profile.photoAlt} width={720} height={960} fetchPriority="high" />
            </picture>
          </div>
          <Tanzaku />
        </div>
      </section>

      <Garden />

      {/* ---------- About ---------- */}
      <Panel id="about" num="01" vert="紹介" title="About" label="shōkai · introduction">
        <div className="prose">
          {about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="stats">
          {about.stats.map((s) => (
            <div className="stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <BrushBreak />

      {/* ---------- Now ---------- */}
      <Panel id="now" num="02" vert="今" title="Now" label={`ima · updated ${new Date(now.updated).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}>
        <ul className="now">
          {now.items.map((it) => (
            <li key={it.label}>
              <span className="g" aria-hidden="true" lang="ja">
                {it.glyph}
              </span>
              <div>
                <span className="label">{it.label}</span>
                <p>{it.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <BrushBreak />

      {/* ---------- Experience ---------- */}
      <Panel id="experience" num="03" vert="経歴" title="Experience" label="keireki · career">
        {experience.map((j) => (
          <article className="job" key={j.role + j.company}>
            <div className="job-head">
              <h3>
                {j.role} <span className="co">· {j.company}</span>
              </h3>
              <span className="label">
                {j.start} – {j.end}
              </span>
            </div>
            <ul>
              {j.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <ul className="tags">
              {j.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>
        ))}
      </Panel>

      <BrushBreak />

      {/* ---------- Projects ---------- */}
      <Panel id="projects" num="04" vert="作品" title="Projects" label="sakuhin · things I've built">
        <div className="projects">
          {projects.map((p, i) => (
            <article className={`project${i < 2 || (i === projects.length - 1 && (projects.length - 2) % 2 === 1) ? " wide" : ""}`} key={p.title}>
              <div className="kind">
                <span className="label">
                  {p.kind}
                  {p.year ? ` · ${p.year}` : ""}
                </span>
                {p.badge && <span className="badge">{p.badge}</span>}
              </div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <ul className="tags">
                {p.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {(p.url || p.repo) && (
                <div className="project-links">
                  {p.url && (
                    <a href={p.url} {...ext}>
                      Live <IconArrow />
                    </a>
                  )}
                  {p.repo && (
                    <a href={p.repo} {...ext}>
                      <IconGithub /> Code
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {repos.length > 0 && (
          <>
            <div className="subhead">
              <h3>From GitHub</h3>
              <span className="label">live from @{profile.githubUsername}</span>
            </div>
            <div className="repos">
              {repos.map((r) => (
                <a className="repo" key={r.url} href={r.homepage || r.url} {...ext}>
                  <b>{r.name}</b>
                  {r.description && <p>{r.description}</p>}
                  <span className="meta">
                    {r.language && (
                      <span>
                        <span className="dot" style={{ background: LANG_COLOURS[r.language] ?? "rgb(var(--ink-faint))" }} />
                        {r.language}
                      </span>
                    )}
                    {r.stars > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <IconStar />
                        {r.stars}
                      </span>
                    )}
                    {r.homepage && <span className="live">● live</span>}
                  </span>
                </a>
              ))}
            </div>
            <p className="more">
              <a className="link-line" href={`${profile.links.github}?tab=repositories`} {...ext}>
                All repositories on GitHub →
              </a>
            </p>
          </>
        )}
      </Panel>

      <BrushBreak />

      {/* ---------- Skills ---------- */}
      <Panel id="skills" num="05" vert="技能" title="Skills" label="ginō">
        <div className="skills">
          {skills.groups.map((g) => (
            <div className="skill-row" key={g.name}>
              <span className="label">{g.name}</span>
              <ul className="tags">
                {g.items.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="creds">
          <div className="cred">
            <span className="label">Certifications</span>
            <ul>
              {skills.certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="cred">
            <span className="label">Education</span>
            <p>
              <b>{skills.education.degree}</b>
              <br />
              <span>{skills.education.school}</span>
              <br />
              <span className="label">{skills.education.years}</span>
            </p>
          </div>
        </div>
      </Panel>

      <BrushBreak />

      {/* ---------- Contact ---------- */}
      <section id="contact" className="panel" aria-labelledby="contact-title" style={{ display: "block" }}>
        <div className="contact" data-reveal>
          <span className="contact-ja" lang="ja">
            連絡 · renraku
          </span>
          <h2 id="contact-title" className="serif">
            Have a workflow that should run itself?
          </h2>
          <p>
            I'm happy to talk about AI agents, Oracle Fusion automation, or anything in between. The fastest way to reach me is email.
          </p>
          <div className="cta">
            <a className="btn primary" href={`mailto:${profile.email}`}>
              <IconMail /> {profile.email}
            </a>
            <CopyEmail email={profile.email} />
            <a className="btn" href={profile.links.linkedin} {...ext}>
              <IconLinkedin /> LinkedIn
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
