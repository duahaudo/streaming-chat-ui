import type { Metadata } from "next";
import { Inter_Tight, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Demo Streaming Chat",
  description: "Streaming chat demo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${plexMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden bg-canvas text-ink">{children}</body>
    </html>
  );
}
