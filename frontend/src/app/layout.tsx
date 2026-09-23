import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DashboardLayout from "../components/layout/DashboardLayout";
import { LanguageProvider } from "../context/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHIP DESIGN AI — Offshore and Subsea Production Research Laboratory - opart",
  description: "SHIP DESIGN AI — Offshore and Subsea Production Research Laboratory - opart. Platform Rancang Bangun Kapal & Sistem Produksi Bawah Laut Terintegrasi AI.",
  icons: {
    icon: [
      { url: "/favicon.ico" }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={` ${geistSans.variable}  ${geistMono.variable} h-screen overflow-hidden antialiased bg-surface-canvas text-text-primary`}>
        <LanguageProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
