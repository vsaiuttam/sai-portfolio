import type { Metadata } from "next";
import profile from "@/data/profile.json";
import about from "@/data/about.json";
import experienceData from "@/data/experience.json";
import projectsData from "@/data/projects.json";
import skillsData from "@/data/skills.json";
import type { Experience, Project, Skills } from "@/lib/types";
import { IconFile } from "@/components/icons";

export const metadata: Metadata = {
  title: "Resume",
  description: `Resume of ${profile.name}, ${profile.title} at ${profile.company}.`,
  alternates: { canonical: "/resume" },
};

const experience = experienceData as Experience[];
const enterprise = (projectsData as Project[]).filter((p) => p.kind.startsWith("Enterprise"));
const skills = skillsData as Skills;
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

// The resume as a page: readable on a phone, prints cleanly to A4 (the
// header, footer and this bar are hidden in print), with the PDF alongside.
export default function Resume() {
  return (
    <main id="main" className="wrap">
      <div className="resume-bar">
        <a className="btn" href="/">
          ← Back
        </a>
        <a className="btn primary" href={profile.links.resumePdf} download>
          <IconFile /> Download PDF
        </a>
      </div>
      <article className="resume">
        <header>
          <h1>{profile.name}</h1>
          <p className="role">
            {profile.title} · AI Engineer | Agentic AI | LLM Systems
          </p>
          <p className="contactline">
            {profile.location} · <a href={`mailto:${profile.email}`}>{profile.email}</a> ·{" "}
            <a href={profile.links.linkedin}>{bare(profile.links.linkedin)}</a> · <a href={profile.links.github}>{bare(profile.links.github)}</a>
          </p>
        </header>

        <h2>Professional summary</h2>
        <p>{about.paragraphs[0]}</p>

        <h2>Technical skills</h2>
        <div className="skillgrid">
          {skills.groups.map((g) => (
            <div key={g.name} style={{ display: "contents" }}>
              <b>{g.name}</b>
              <span>{g.items.join(", ")}</span>
            </div>
          ))}
        </div>

        <h2>Professional experience</h2>
        {experience.map((j) => (
          <section key={j.role}>
            <h3>
              {j.role} · {j.company}{" "}
              <small>
                · {j.start} – {j.end}
              </small>
            </h3>
            <ul>
              {j.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}

        <h2>AI agent projects</h2>
        {enterprise.map((p) => (
          <section key={p.title}>
            <h3>
              {p.title} <small>· {p.tags.join(" • ")}</small>
            </h3>
            <p>{p.description}</p>
          </section>
        ))}

        <h2>Certifications</h2>
        <p>{skills.certifications.join(" • ")}</p>

        <h2>Education</h2>
        <p>
          <b>{skills.education.degree}</b> · {skills.education.school} · {skills.education.years}
        </p>
      </article>
    </main>
  );
}
