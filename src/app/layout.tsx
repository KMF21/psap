import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSAP — Practical Skills Assessment Portal",
  description: "Practical skills examination and scoring portal for Community Health students.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full flex flex-col bg-bg">{children}</body>
      </html>
    </ClerkProvider>
  );
}
