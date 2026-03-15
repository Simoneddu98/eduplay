import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "EduPlay — Impara Giocando",
    template: "%s | EduPlay",
  },
  description:
    "Piattaforma educativa gamificata per Digital Marketing, AI e Vendita. Guadagna XP, sblocca badge e scala la leaderboard mentre impari.",
  keywords: ["digital marketing", "AI", "vendita", "e-learning", "gamification", "corsi online"],
  authors: [{ name: "Simone", url: "https://eduplay.io" }],
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://eduplay.io",
    siteName: "EduPlay",
    title: "EduPlay — Impara Giocando",
    description: "Piattaforma educativa gamificata per Digital Marketing, AI e Vendita.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPlay — Impara Giocando",
    description: "Piattaforma educativa gamificata per Digital Marketing, AI e Vendita.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
