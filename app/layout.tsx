import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_Devanagari, Shippori_Mincho } from "next/font/google";
import profile from "@/data/profile.json";
import { InkFilter, Seal } from "@/components/ui";
import { Nav, RevealObserver, RituButton, RituProvider, ThemeToggle } from "@/components/client";
import "./globals.css";

const mincho = Shippori_Mincho({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--f-mincho", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });
const deva = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--f-deva", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
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
    <html lang="en" suppressHydrationWarning className={`${mincho.variable} ${inter.variable} ${mono.variable} ${deva.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      </head>
      <body>
        <InkFilter />
        <a href="#main" className="skip">
          Skip to content
        </a>
        <RituProvider>
          <header className="header">
            <div className="wrap header-inner">
              <a href="/" className="brand" aria-label={`${profile.name}, home`}>
                <Seal size={1.9} />
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
              <RituButton />
            </div>
          </footer>
        </RituProvider>
        <RevealObserver />
      </body>
    </html>
  );
}
