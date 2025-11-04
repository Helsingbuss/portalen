// /public/widget/trips.js
(function () {
  function $(sel) { return document.querySelector(sel); }

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
      const card = document.createElement("a");
      card.href = (linkbase || "/trip/") + t.id;
      card.target = "_self";
      card.rel = "noopener";
      card.style.textDecoration = "none";
      card.style.color = "inherit";

      const wrap = document.createElement("div");
      css(wrap, {
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 1px 6px rgba(0,0,0,.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      });

      // bild
      if (t.image) {
        const fig = document.createElement("div");
        css(fig, { position: "relative" });
        const img = document.createElement("img");
        img.src = t.image;
        img.alt = t.title || "";
        css(img, { width: "100%", height: "200px", objectFit: "cover", display: "block" });
        fig.appendChild(img);

        // banderoll (röd sned)
        if (t.ribbon && t.ribbon.text) {
          const rb = document.createElement("div");
          rb.textContent = t.ribbon.text;
          css(rb, {
            position: "absolute",
            top: "16px",
            left: "-40px",
            transform: "rotate(-10deg)",
            background: "#EF4444",
            color: "#fff",
            padding: "8px 28px",
            fontWeight: "700",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            letterSpacing: ".3px",
          });
          fig.appendChild(rb);
        }
        wrap.appendChild(fig);
      }

      const body = document.createElement("div");
      css(body, { padding: "14px 14px 16px 14px" });

      if (t.badge) {
        const badge = document.createElement("div");
        badge.textContent = t.badge;
        css(badge, {
          display: "inline-block",
          background: "#F1F5F9",
          color: "#0F172A",
          fontSize: "12px",
          borderRadius: "999px",
          padding: "3px 10px",
          marginBottom: "6px",
          fontWeight: "600",
        });
        body.appendChild(badge);
      }

      const h = document.createElement("div");
      h.textContent = t.title || "";
      css(h, { fontSize: "18px", fontWeight: "700", color: "#194C66" });
      body.appendChild(h);

      if (t.subtitle) {
        const sub = document.createElement("div");
        sub.textContent = t.subtitle;
        css(sub, { marginTop: "6px", color: "#0f172a99" });
        body.appendChild(sub);
      }

      if (t.city || t.country) {
        const loc = document.createElement("div");
        loc.textContent = [t.city, t.country].filter(Boolean).join(", ");
        css(loc, { marginTop: "6px", fontSize: "13px", color: "#0f172a99" });
        body.appendChild(loc);
      }

      if (t.price_from != null) {
        const price = document.createElement("div");
        price.textContent = "fr. " + Number(t.price_from).toLocaleString("sv-SE") + ":-";
        css(price, { marginTop: "10px", fontWeight: "700", color: "#A83248" });
        body.appendChild(price);
      }

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
