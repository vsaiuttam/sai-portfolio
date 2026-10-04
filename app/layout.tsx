import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Zen_Old_Mincho } from "next/font/google";
import profile from "@/data/profile.json";
import { Enso, InkFilter } from "@/components/ui";
import { Nav, RevealObserver, ThemeToggle } from "@/components/client";
import Noren from "@/components/noren";
import "./globals.css";

// Zen Old Mincho carries both the Latin headings and the kanji; the browser
// only downloads the Japanese glyph ranges the page actually uses.
const mincho = Zen_Old_Mincho({ subsets: ["latin"], weight: ["400", "600", "700", "900"], variable: "--f-mincho", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });

const description = `${profile.name}: ${profile.title} at ${profile.company} and AI engineer in ${profile.location}. ${profile.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(profile.site),
  title: { default: `${profile.name} · AI Engineer`, template: `%s · ${profile.shortName}` },
  description,
  authors: [{ name: profile.name, url: profile.site }],
  keywords: ["AI Engineer", "Agentic AI", "LangGraph", "CrewAI", "Copilot Studio", "Oracle Fusion", "Oracle AI Agent Studio", "RAG", "Hyderabad"],
  openGraph: {
    type: "profile",
    title: `${profile.name} · AI Engineer`,
    description,
    url: "/",
    images: [{ url: "/sai-square.jpg", width: 400, height: 400, alt: profile.name }],
  },
  twitter: { card: "summary", title: `${profile.name} · AI Engineer`, description, images: ["/sai-square.jpg"] },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1321" },
  ],
};

// Runs before paint: apply a saved theme (no flash) and mark JS as on, so
// scroll-reveal styles only apply when the script that reveals them runs.
const boot = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.dataset.theme=t}catch(e){}})();`;

const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.title,
  worksFor: { "@type": "Organization", name: profile.company },
  address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
  url: profile.site,
  email: `mailto:${profile.email}`,
  sameAs: [profile.links.github, profile.links.linkedin],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mincho.variable} ${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      </head>
      <body>
        <InkFilter />
        <a href="#main" className="skip">
          Skip to content
        </a>
          <header className="header">
            <div className="wrap header-inner">
              <a href="/" className="brand" aria-label={`${profile.name}, home`}>
                <Enso size={1.9} />
                <span>{profile.shortName}</span>
              </a>
              <Nav />
              <ThemeToggle />
            </div>
          </header>
          {children}
          <footer className="footer">
            <div className="wrap footer-inner">
              <span>
                © {new Date().getFullYear()} {profile.name} · Hyderabad
              </span>
              <span lang="ja" className="footer-ja">
                一期一会 · <span lang="en">every meeting, once in a lifetime</span>
              </span>
            </div>
          </footer>
          <Noren />
        <RevealObserver />
      </body>
    </html>
  );
}
