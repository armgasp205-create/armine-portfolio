import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Արմինե · Ուսման օրագիր", template: "%s | Արմինե" },
  description: "Front-End ուսման փոքր օրագիր՝ HTML-ից մինչև Next.js։",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hy">
      <body>
        <a className="skip" href="#content">Անցնել բովանդակությանը</a>
        <header className="header">
          <Link className="brand" href="/">Արմինե<span> / օրագիր</span></Link>
          <nav aria-label="Հիմնական նավիգացիա">
            <Link href="/">Հոդվածներ</Link>
            <a href={`${process.env.PAGES_BASE || ""}/index.html#projects`}>Պորտֆոլիո ↗</a>
          </nav>
        </header>
        <main id="content">{children}</main>
        <footer>Արմինե · Սովորում եմ, ստեղծում, կիսվում։</footer>
      </body>
    </html>
  );
}
