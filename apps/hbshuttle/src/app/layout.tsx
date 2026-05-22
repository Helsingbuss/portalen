import type { Metadata } from "next";
import AppDownloadBanner from "@/components/shuttle/AppDownloadBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helsingbuss Airport Shuttle",
  description: "Till flyget. Utan stress. Vi kör."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>
        {children}
        <AppDownloadBanner />
      </body>
    </html>
  );
}
