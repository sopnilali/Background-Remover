import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Background Remover",
  description: "Remove image backgrounds for free, in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
