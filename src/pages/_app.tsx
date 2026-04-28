// src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Script from "next/script";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const path = router.asPath || "";

  const isSundra =
    path.startsWith("/admin/sundra") ||
    path.startsWith("/agent/sundra") ||
    path.startsWith("/sundra");

  const faviconHref = isSundra
    ? "/sundra_logo_icon_farg.svg"
    : "/favicon.ico";

  // 🔥 TRACKA SIDBYTEN (båda GA)
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      window.gtag("config", "G-TM2QG8470R", {
        page_path: url,
      });

      window.gtag("config", "G-6G183S3SEJ", {
        page_path: url,
      });
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      <Head>
        <link rel="icon" href={faviconHref} type="image/svg+xml" />
        <link rel="icon" href={faviconHref} sizes="any" />
      </Head>

      {/* 🔥 GOOGLE ANALYTICS (LADDAS EN GÅNG) */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-TM2QG8470R"
        strategy="afterInteractive"
      />

      <Script id="ga-script" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;

          gtag('js', new Date());

          // Helsingbuss
          gtag('config', 'G-TM2QG8470R', {
            page_path: window.location.pathname,
          });

          // Shuttle
          gtag('config', 'G-6G183S3SEJ', {
            page_path: window.location.pathname,
          });
        `}
      </Script>

      <Component {...pageProps} />
    </>
  );
}
