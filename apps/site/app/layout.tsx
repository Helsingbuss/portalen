import type { Metadata } from "next";
import "./globals.css";
import { Open_Sans } from "next/font/google";

import Header from "../components/layout/Header";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Helsingbuss",
  description: "Beställ buss i Skåne – tryggt, premium och personligt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={openSans.variable}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}


