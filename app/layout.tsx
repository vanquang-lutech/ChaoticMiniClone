import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chaotic Club — Make It Chaotic",
  description: "Custom jerseys with AI-powered artwork, clean image cutouts, and stylised text.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
