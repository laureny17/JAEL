import type { Metadata } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "step step learn",
  description: "generate dance levels from your ideas and learn through movement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/pxe1cjr.css" />
      </head>
      <body
        className={`${nunito.variable} ${geistMono.variable} antialiased lowercase`}
      >
        {children}
      </body>
    </html>
  );
}
