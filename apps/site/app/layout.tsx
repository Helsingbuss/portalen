import Header from "../components/layout/Header";
import type { Metadata } from "next";
import "./globals.css";
import { Open_Sans } from "next/font/google";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Helsingbuss",
  description: "Helsingbuss",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={openSans.variable}>
        <Header />
        {children}
      </body>
    </html>
  );
}












