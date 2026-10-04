"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { onSoundChange, setSoundOn, sound, soundOn } from "@/lib/sound";
import { IconClose, IconCopy, IconKeyboard, IconMenu, IconMoon, IconMute, IconSound, IconSun } from "./icons";

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

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** Flips the theme from anywhere (button or the D key); returns the new mode. */
export function toggleTheme() {
  const d = !isDark();
  document.documentElement.dataset.theme = d ? "dark" : "light";
  store.set("theme", d ? "dark" : "light");
  window.dispatchEvent(new Event("themechange"));
  sound.theme(d);
  return d;
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => setDark(isDark());
    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);
  return (
    <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title="Theme (D)">
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

/* ---------- Sound ---------- */

export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundOn());
    return onSoundChange(setOn);
  }, []);
  const toggle = () => {
    setSoundOn(!soundOn());
    if (soundOn()) sound.tick();
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-pressed={on} aria-label={on ? "Mute sounds" : "Turn sounds on"} title="Sound (M)">
      {on ? <IconSound /> : <IconMute />}
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

function useActiveSection() {
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
  return active;
}

export function Nav() {
  const active = useActiveSection();
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

/** The same links in a drop-down sheet, for narrow screens. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="mobile-menu">
      <button type="button" className="icon-btn" aria-expanded={open} aria-controls="mobile-sheet" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
        {open ? <IconClose /> : <IconMenu />}
      </button>
      {open && (
        <nav id="mobile-sheet" className="mobile-sheet" aria-label="Sections" onClick={() => setOpen(false)}>
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`/#${id}`} aria-current={active === id ? "true" : undefined}>
              <span className="label">0{i + 1}</span> {label}
            </a>
          ))}
          <a href="/resume">
            <span className="label">履歴</span> Resume
          </a>
        </nav>
      )}
    </div>
  );
}

/* ---------- Keyboard shortcuts ---------- */

const KEYS: [string, string][] = [
  ["D", "Dark / light theme"],
  ["M", "Sound on / off"],
  ["1–5", "Jump to About, Experience, Projects, Skills, Contact"],
  ["G", "Go to the garden"],
  ["R", "Open the resume"],
  ["T", "Back to the top"],
  ["?", "Show these shortcuts"],
];

export const openShortcuts = () => window.dispatchEvent(new Event("shortcuts:open"));

export function Shortcuts() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const notify = useCallback((text: string) => setToast({ text, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const open = () => {
      if (!dialog.current?.open) dialog.current?.showModal();
      sound.tick();
    };
    // Navigate through a real link so the noren curtain plays.
    const follow = (href: string) => {
      const a = document.createElement("a");
      a.href = href;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    const go = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else follow(`/#${id}`);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (dialog.current?.open && e.key !== "?") return;
      const k = e.key.toLowerCase();
      if (e.key === "?") {
        e.preventDefault();
        open();
      } else if (k === "d") notify(toggleTheme() ? "Dark theme" : "Light theme");
      else if (k === "m") {
        setSoundOn(!soundOn());
        if (soundOn()) sound.tick();
        notify(soundOn() ? "Sound on" : "Sound muted");
      } else if (k === "t") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (k === "r" && location.pathname !== "/resume") follow("/resume");
      else if (k === "g") go("garden");
      else if (/^[1-5]$/.test(k)) go(SECTIONS[Number(k) - 1][0]);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("shortcuts:open", open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("shortcuts:open", open);
    };
  }, [notify]);

  return (
    <>
      <dialog
        ref={dialog}
        className="shortcuts"
        aria-labelledby="shortcuts-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="shortcuts-inner">
          <div className="shortcuts-head">
            <h2 id="shortcuts-title">
              <span lang="ja">鍵</span> Keyboard shortcuts
            </h2>
            <button type="button" className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Close">
              <IconClose />
            </button>
          </div>
          <ul>
            {KEYS.map(([k, v]) => (
              <li key={k}>
                <kbd>{k}</kbd>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </>
  );
}

export function ShortcutsButton() {
  return (
    <button type="button" className="footer-link" onClick={openShortcuts}>
      <IconKeyboard /> Shortcuts <kbd>?</kbd>
    </button>
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
      sound.stamp();
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
