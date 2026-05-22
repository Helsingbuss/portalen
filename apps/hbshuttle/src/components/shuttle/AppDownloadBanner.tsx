"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "hbshuttle_app_banner_closed";

export default function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const bannerEnabled =
      process.env.NEXT_PUBLIC_APP_BANNER_ENABLED === "true";

    if (!bannerEnabled) {
      setVisible(false);
      return;
    }

    const hasClosedBanner = window.localStorage.getItem(STORAGE_KEY);

    if (hasClosedBanner === "true") {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, []);

  function closeBanner() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <aside className="app-download-banner" aria-label="Helsingbuss-appen">
      <div className="app-download-icon">
        <span>HB</span>
      </div>

      <div className="app-download-content">
        <p className="app-download-title">
          Få bästa upplevelsen i appen
        </p>
        <p className="app-download-text">
          Biljetter, QR-kod och reseuppdateringar direkt i mobilen.
        </p>
      </div>

      <Link href="/appen" className="app-download-link">
        Läs mer
      </Link>

      <button
        type="button"
        className="app-download-close"
        onClick={closeBanner}
        aria-label="Stäng apprekommendation"
      >
        ×
      </button>
    </aside>
  );
}
