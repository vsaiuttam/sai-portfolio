"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconCopy, IconMoon, IconSun } from "./icons";

// Browser storage can throw (private windows, blocked site data): every
// access is wrapped and the page works without it.
const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};

/* ---------- Theme ---------- */

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    const t = el.dataset.theme;
    setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.dataset.theme = d ? "dark" : "light";
    store.set("theme", d ? "dark" : "light");
    window.dispatchEvent(new Event("themechange"));
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

/* ---------- Header nav with the current section marked ---------- */

const SECTIONS = [
  ["about", "About"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["skills", "Skills"],
  ["contact", "Contact"],
] as const;

export function Nav() {
  const [active, setActive] = useState<string>("");
  // The header lives in the layout and outlasts page changes: re-find the
  // sections whenever the page changes.
  const pathname = usePathname();
  useEffect(() => {
    setActive("");
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return (
    <nav className="nav" aria-label="Sections">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`/#${id}`} aria-current={active === id ? "true" : undefined}>
          {label}
        </a>
      ))}
      <a href="/resume">Resume</a>
    </nav>
  );
}

/* ---------- Rotating role ---------- */

export function FlipText({ words, interval = 2600 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="flip" aria-live="off">
      <span key={i}>{words[i]}</span>
    </span>
  );
}

/* ---------- Copy email ---------- */

export function CopyEmail({ email, className = "btn" }: { email: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };
  return (
    <button type="button" className={`${className} copied`} data-done={done} onClick={copy} aria-label={`Copy email address ${email}`}>
      <IconCopy />
      {done ? "Copied!" : "Copy email"}
    </button>
  );
}

/* ---------- Reveal sections as they scroll in ---------- */

export function RevealObserver() {
  // Mounted once in the layout, so it must look again after every page
  // change: a page reached by client-side navigation brings new sections.
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
