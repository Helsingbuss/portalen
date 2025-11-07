// /public/widget/trips.js
(function () {
  function css(el, styles) { Object.assign(el.style, styles || {}); return el; }

  function renderTrips(el, items, cols, linkbase) {
    el.innerHTML = "";
    css(el, {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
      gap: "16px",
      alignItems: "stretch",
    });

    items.forEach((t) => {
      // Länk: extern först, annars linkbase + id
      var href = t.external_url || t.href || ((linkbase || "/trip/").replace(/\/+$/, "/") + (t.id || ""));

      const card = document.createElement(href ? "a" : "div");
      if (href) { card.href = href; card.target = "_self"; card.rel = "noopener"; }
      card.style.textDecoration = "none";
      card.style.color = "inherit";

      const wrap = document.createElement("div");
      css(wrap, {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        boxShadow: "0 1px 6px rgba(0,0,0,.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow .2s ease",
      });
      card.addEventListener("mouseenter", () => (wrap.style.boxShadow = "0 3px 16px rgba(0,0,0,.1)"));
      card.addEventListener("mouseleave", () => (wrap.style.boxShadow = "0 1px 6px rgba(0,0,0,.06)"));

      // Bild 600x390 (aspect ~ 65%)
      const fig = document.createElement("div");
      css(fig, { position: "relative", background: "#f3f4f6" });
      const ph = document.createElement("div");
      css(ph, { width: "100%", paddingTop: "65%" });
      fig.appendChild(ph);

      if (t.image) {
        const img = document.createElement("img");
        img.src = t.image;
        img.alt = t.title || "";
        css(img, {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        });
        fig.appendChild(img);
      }
      wrap.appendChild(fig);

      // Body
      const body = document.createElement("div");
      css(body, { padding: "14px" });

      // Piller: land + år (badge kan vara null i ditt API, så vi skippar den när den saknas)
      const pills = document.createElement("div");
      css(pills, { display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px" });

      function pill(txt) {
        if (!txt) return;
        const p = document.createElement("span");
        p.textContent = txt;
        css(p, {
          background: "#f1f5f9",
          color: "#334155",
          padding: "4px 8px",
          borderRadius: "999px",
          fontWeight: "600",
        });
        pills.appendChild(p);
      }
      pill(t.country); // ex. "Sverige"
      pill(t.year);    // ex. 2025

      if (pills.childNodes.length) body.appendChild(pills);

      // Titel
      const h = document.createElement("div");
      h.textContent = t.title || "";
      css(h, {
        marginTop: pills.childNodes.length ? "8px" : "0",
        fontSize: "18px",
        fontWeight: "700",
        color: "#0f172a",
      });
      body.appendChild(h);

      // Kort om resan (subtitle)
      if (t.subtitle) {
        const sub = document.createElement("div");
        sub.textContent = t.subtitle;
        css(sub, { marginTop: "6px", color: "#0f172ab3", fontSize: "14px", lineHeight: "1.45" });
        body.appendChild(sub);
      }

      // Bottrad: Nästa avgång / Flera datum + pris-chip till höger
      const foot = document.createElement("div");
      css(foot, { marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" });

      const left = document.createElement("span");
      css(left, { fontSize: "13px", color: "#0f172a99" });
      if (t.next_date) {
        // t.next_date kommer i ISO (YYYY-MM-DD) — visa som svenskt datum
        const d = new Date(t.next_date + "T00:00:00");
        const sv = isNaN(d.getTime()) ? t.next_date : d.toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
        left.textContent = "Nästa avgång: " + sv;
      } else {
        left.textContent = "Flera datum";
      }
      foot.appendChild(left);

      if (t.price_from != null) {
        const price = document.createElement("span");
        price.textContent = "fr. " + Number(t.price_from).toLocaleString("sv-SE") + " kr";
        css(price, {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#eef2f7",
          color: "#0f172a",
          fontWeight: "700",
          fontSize: "14px",
          whiteSpace: "nowrap",
        });
        foot.appendChild(price);
      }

      body.appendChild(foot);
      wrap.appendChild(body);
      card.appendChild(wrap);
      el.appendChild(card);
    });
  }

  async function boot() {
    const el = document.getElementById("hb-trips");
    if (!el) return;

    const api = (el.getAttribute("data-api") || "").replace(/\/$/, "");
    const limit = Number(el.getAttribute("data-limit") || "6") || 6;
    const cols = Number(el.getAttribute("data-columns") || "3") || 3;
    const linkbase = (el.getAttribute("data-link-base") || "/trip/").replace(/\/\/+$/, "/");

    const url = `${api}/api/public/trips?limit=${encodeURIComponent(limit)}&_=${Date.now()}`;

    try {
      const r = await fetch(url, { method: "GET", mode: "cors", credentials: "omit" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();

      if (!j || !Array.isArray(j.trips)) throw new Error("Felaktigt format från API.");
      if (j.trips.length === 0) {
        el.innerHTML = '<div style="color:#666">Inga resor att visa ännu.</div>';
        return;
      }
      renderTrips(el, j.trips, cols, linkbase);
    } catch (e) {
      console.error("HB Widget: kunde inte hämta resor:", e);
      el.innerHTML = '<div style="color:#B00020">Kunde inte hämta resor.</div>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
