import profile from "@/data/profile.json";
import about from "@/data/about.json";
import now from "@/data/now.json";

export type Profile = typeof profile;
export type About = typeof about;
export type Now = typeof now;

export type Experience = {
  role: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  points: string[];
  tags: string[];
};

export type Project = {
  title: string;
  kind: string;
  year?: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
  featured?: boolean;
  badge?: string;
};

export type Skills = {
  groups: { name: string; items: string[] }[];
  certifications: string[];
  education: { degree: string; school: string; years: string };
};

export type Repo = {
  name: string;
  description: string;
  url: string;
  homepage?: string;
  language?: string;
  stars: number;
  updated: string;
};
