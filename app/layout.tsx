/**
 * The app shell: skip link, header nav, main landmark, footer.
 *
 * `metadataBase` is left to Next's default; each page exports its own `title` so
 * every route has a unique, descriptive document title.
 */
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';

export const metadata: Metadata = {
  title: {
    default: 'SkillSwap — a creator gig marketplace',
    template: '%s · SkillSwap',
  },
  description:
    'SkillSwap is a marketplace where young creators list design, editing, tutoring and music gigs, and clients book them directly.',
  applicationName: 'SkillSwap',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <a className="brand" href="/">
              <span>
                Skill<span className="brand__mark">Swap</span>
              </span>
              <span className="brand__tag">creator gig marketplace</span>
            </a>
            <SiteNav />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>
              SkillSwap — built for the Azisly Hackathon, Track C. Rates are shown in Indian rupees (₹).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
