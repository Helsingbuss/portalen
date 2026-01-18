import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Helsingbuss – Staging",
  description: "Staging-miljö för nya Helsingbuss.se",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
