import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "News Intelligence", description: "A source-grounded personal news briefing." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="app-shell"><header className="topbar"><Link href="/" className="brand"><span className="brand-mark">NI</span><span>News Intelligence</span></Link><nav className="topnav"><Link href="/">For You</Link><Link href="/search?topic=business">Business</Link><Link href="/search?topic=finance-markets">Finance</Link><Link href="/search?topic=stock-market">Markets</Link><Link href="/search?topic=economy">Economy</Link><Link href="/search?topic=real-estate">Real Estate</Link><Link href="/search?topic=energy">Energy</Link><Link href="/news-reel">News Reel</Link><Link href="/status">Status</Link></nav><div className="top-actions"><Link className="button" href="/news-reel">News Reel</Link><Link className="button" href="/settings">Preferences</Link></div></header>{children}</div></body></html>;
}
