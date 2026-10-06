import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareCommute | Campus rides, together",
  description:
    "Find a ride, share your empty seats, and split the journey cost with your campus community. ShareCommute interactive project demo.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
