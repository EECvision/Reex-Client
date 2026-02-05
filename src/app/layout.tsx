import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reex API Builder",
  description: "Generate API integration code for your projects by uploading collections. A comprehensive toolkit for building, testing, and managing API integrations.",
};

import { ProjectProvider } from "@/providers/ProjectContext";
import { SettingsProvider } from "@/providers/SettingsContext";
import { AuthProvider } from "@/providers/AuthContext";
import FloatingTestButton from "@/components/FloatingTestButton/FloatingTestButton";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SettingsProvider>
          <AuthProvider>
            <ProjectProvider>
              {children}
              <FloatingTestButton />
            </ProjectProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
