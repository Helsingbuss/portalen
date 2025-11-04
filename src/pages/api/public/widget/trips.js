(() => {
  const el = document.getElementById("hb-trips");
  if (!el) return;

  const api = (el.getAttribute("data-api") || "").replace(/\/$/, "");
  const limit = Number(el.getAttribute("data-limit") || "6");
  const columns = Number(el.getAttribute("data-columns") || "3");
  const linkBase = (el.getAttribute("data-link-base") || "").replace(/\/$/, "") + "/";

  function h(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    for (const c of children) n.append(c);
    return n;
  }

  function money(n) {
    try {
      return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
    } catch { return `kr ${n}`; }
  }

  function css() {
    const s = document.createElement("style");
    s.innerHTML = `
      .hb-grid { display:grid; gap:24px; grid-template-columns: 1fr; }
      @media (min-width:640px){ .hb-grid{ grid-template-columns: repeat(2,1fr); } }
      @media (min-width:1024px){
        .hb-grid[data-cols="3"]{ grid-template-columns: repeat(3,1fr); }
        .hb-grid[data-cols="4"]{ grid-template-columns: repeat(4,1fr); }
        .hb-grid[data-cols="5"]{ grid-template-columns: repeat(5,1fr); }
      }
      .hb-card{ border-radius:16px; overflow:hidden; box-shadow:0 10px 20px rgba(0,0,0,.06); background:#fff; transition:box-shadow .2s }
      .hb-card:hover{ box-shadow:0 14px 28px rgba(0,0,0,.10) }
      .hb-imgwrap{ position:relative; padding-top:62.5%; background:#f2f2f2 }
      .hb-imgwrap img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover }
      .hb-ribbon{ position:absolute; left:0; top:16px; transform:rotate(-10deg); }
      .hb-ribbon .hb-rb{ background:#e74c3c; color:#fff; font-weight:600; padding:6px 12px; border-radius:6px; box-shadow:0 4px 8px rgba(0,0,0,.15) }
      .hb-body{ padding:14px }
      .hb-badge{ display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; background:rgba(25,76,102,.12); color:#194C66; font-weight:600; margin-right:6px }
      .hb-title{ font-weight:700; color:#0f172a; font-size:18px; margin-top:2px }
      .hb-sub{ color:#334155; font-size:14px; margin-top:4px }
      .hb-foot{ display:flex; align-items:end; justify-content:space-between; margin-top:12px; }
      .hb-chip{ background:#194C66; color:#fff; padding:6px 10px; border-radius:999px; font-size:13px; font-weight:700 }
      .hb-err{ color:#b91c1c; font-weight:600; padding:8px 0 }
      .hb-a{ color:inherit; text-decoration:none }
    `;
    document.head.appendChild(s);
  }

  function render(trips) {
    css();
    const grid = h("div", { class: "hb-grid", "data-cols": String(columns) });

    trips.forEach(t => {
      const card = h("a", { class: "hb-card hb-a", href: linkBase + t.id, "aria-label": t.title });

      const imgWrap = h("div", { class: "hb-imgwrap" });
      if (t.image) {
        const img = new Image();
        img.loading = "lazy";
        img.src = t.image;
        img.alt = t.title || "";
        imgWrap.appendChild(img);
      }

      if (t.ribbon) {
        const r = h("div", { class: "hb-ribbon" }, [ h("div", { class: "hb-rb" }, [document.createTextNode(t.ribbon)]) ]);
        imgWrap.appendChild(r);
      }

      const body = h("div", { class: "hb-body" });
      const badges = h("div");
      if (t.badge) badges.appendChild(h("span", { class: "hb-badge" }, [document.createTextNode(t.badge)]));
      if (t.city || t.country) {
        const loc = [t.city, t.country].filter(Boolean).join(", ");
        badges.appendChild(h("span", { style: "font-size:12px;color:#64748b" }, [document.createTextNode(loc)]));
      }
      body.appendChild(badges);
      body.appendChild(h("div", { class: "hb-title" }, [document.createTextNode(t.title || "")]));
      if (t.subtitle) body.appendChild(h("div", { class: "hb-sub" }, [document.createTextNode(t.subtitle)]));

      const foot = h("div", { class: "hb-foot" });
      foot.appendChild(h("div", { style: "font-size:13px;color:#475569" }, [
        document.createTextNode(t.next_date ? `Nästa avgång ${t.next_date}` : `Flera datum`)
      ]));
      if (t.price_from != null) foot.appendChild(h("div", { class: "hb-chip" }, [document.createTextNode(`fr. ${money(t.price_from)}`)]));
      body.appendChild(foot);

      card.appendChild(imgWrap);
      card.appendChild(body);
      grid.appendChild(card);
    });

    el.innerHTML = "";
    el.appendChild(grid);
  }

  async function run() {
    try {
      const url = `${api}/api/public/trips?limit=${encodeURIComponent(limit)}`;
      const resp = await fetch(url, { credentials: "omit", mode: "cors" });
      const json = await resp.json();
      if (!resp.ok || !json || !Array.isArray(json.trips)) throw new Error("bad response");
      render(json.trips);
    } catch (e) {
      el.innerHTML = '<div class="hb-err">Kunde inte hämta resor.</div>';
      // console.warn("HB widget error:", e);
    }
  }

  run();
})();
