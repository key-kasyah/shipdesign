import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DashboardLayout from "../components/layout/DashboardLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ship Design AI — Universitas Hasanuddin",
  description: "Platform Rancang Bangun Kapal Terintegrasi AI — Departemen Teknik Perkapalan UNHAS",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/unhas-logo.png", type: "image/png" }
    ],
    shortcut: "/unhas-logo.png",
    apple: "/unhas-logo.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} h-screen overflow-hidden antialiased bg-slate-950 text-slate-100`}>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
