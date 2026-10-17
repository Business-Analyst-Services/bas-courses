import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAS Course Portal",
  description: "Business Analyst Services — participant and presenter course portal.",
  icons: { icon: "/bas-mark.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#1789A0", fontFamily: "Poppins, sans-serif" } }}>
      <html lang="en-AU">
        <head>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
