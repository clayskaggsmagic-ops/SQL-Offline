import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Palantir SWE Prep",
  description: "Prepare for Software Engineering interviews at Palantir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.className} bg-[#0d0d0d] text-zinc-300 min-h-screen`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
