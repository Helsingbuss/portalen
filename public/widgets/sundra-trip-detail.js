// public/widgets/sundra-trip-detail.js

(async function () {
  const API_BASE = "https://kund.helsingbuss.se";
  const root = document.querySelector("[data-sundra-trip-detail]");

  if (!root) return;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1];

  function money(value) {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "Datum kommer";

    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  }

  function formatShortDate(value) {
    if (!value) return "Datum";

    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${value}T00:00:00`));
  }

  function time(value) {
    return value ? String(value).slice(0, 5) : "Tid kommer";
  }

  function safe(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function styleOnce() {
    if (document.getElementById("hb-trip-detail-style")) return;

    const style = document.createElement("style");
    style.id = "hb-trip-detail-style";

    style.innerHTML = `
      .hb-trip-page{
        background:#f5f0e8;
        padding:0 0 70px;
        font-family:inherit;
      }

      .hb-trip-hero{
        position:relative;
        min-height:620px;
        overflow:hidden;
        background:#194C66;
        display:flex;
        align-items:flex-end;
      }

      .hb-trip-hero img{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .hb-trip-hero:after{
        content:"";
        position:absolute;
        inset:0;
        background:
          linear-gradient(90deg,rgba(5,22,31,.88),rgba(5,22,31,.48),rgba(5,22,31,.12)),
          linear-gradient(0deg,rgba(5,22,31,.70),rgba(5,22,31,.05));
      }

      .hb-trip-hero-inner{
        position:relative;
        z-index:2;
        width:min(1180px,calc(100% - 40px));
        margin:0 auto;
        padding:0 0 78px;
        color:#fff;
      }

      .hb-trip-kicker{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:10px 16px;
        border-radius:999px;
        background:rgba(255,255,255,.95);
        color:#A61E22;
        font-weight:800;
        font-size:14px;
        margin-bottom:22px;
      }

      .hb-trip-title{
        font-size:clamp(42px,6vw,78px);
        line-height:1.02;
        letter-spacing:-.04em;
        margin:0;
        max-width:850px;
        font-weight:900;
      }

      .hb-trip-lead{
        margin:22px 0 0;
        max-width:720px;
        font-size:19px;
        line-height:1.75;
        color:rgba(255,255,255,.92);
      }

      .hb-trip-topbar{
        width:min(1180px,calc(100% - 40px));
        margin:-48px auto 34px;
        position:relative;
        z-index:4;
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:16px;
      }

      .hb-trip-info-pill{
        background:#fff;
        border-radius:22px;
        padding:20px;
        box-shadow:0 18px 45px rgba(15,23,42,.12);
      }

      .hb-trip-info-label{
        color:#64748b;
        font-size:13px;
        font-weight:700;
        margin-bottom:6px;
      }

      .hb-trip-info-value{
        color:#0f172a;
        font-size:18px;
        font-weight:900;
      }

      .hb-trip-wrap{
        width:min(1180px,calc(100% - 40px));
        margin:0 auto;
        display:grid;
        grid-template-columns:minmax(0,1fr) 390px;
        gap:28px;
        align-items:start;
      }

      .hb-trip-card{
        background:#fff;
        border-radius:30px;
        padding:34px;
        box-shadow:0 14px 35px rgba(15,23,42,.08);
        margin-bottom:26px;
      }

      .hb-trip-card h2{
        margin:0 0 18px;
        color:#194C66;
        font-size:34px;
        line-height:1.15;
        letter-spacing:-.03em;
        font-weight:900;
      }

      .hb-trip-text{
        color:#475569;
        line-height:1.9;
        font-size:16px;
      }

      .hb-trip-dates{
        display:grid;
        gap:14px;
      }

      .hb-trip-date{
        width:100%;
        border:1px solid #e2e8f0;
        background:#fff;
        border-radius:22px;
        padding:18px;
        display:grid;
        grid-template-columns:74px 1fr auto;
        gap:18px;
        align-items:center;
        text-align:left;
        cursor:pointer;
        transition:.2s ease;
      }

      .hb-trip-date:hover{
        transform:translateY(-2px);
        border-color:#007764;
        box-shadow:0 12px 28px rgba(15,23,42,.08);
      }

      .hb-trip-date-box{
        width:64px;
        height:64px;
        border-radius:18px;
        background:#fce7e7;
        color:#A61E22;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        font-weight:900;
        font-size:14px;
        line-height:1.15;
      }

      .hb-trip-date-title{
        color:#0f172a;
        font-size:17px;
        font-weight:900;
      }

      .hb-trip-date-meta{
        margin-top:5px;
        color:#64748b;
        font-size:14px;
      }

      .hb-trip-date-price{
        text-align:right;
        color:#194C66;
        font-size:22px;
        font-weight:900;
      }

      .hb-trip-date-seats{
        display:block;
        margin-top:4px;
        color:#64748b;
        font-size:12px;
        font-weight:700;
      }

      .hb-trip-book{
        position:sticky;
        top:28px;
        background:#fff;
        border-radius:30px;
        padding:30px;
        box-shadow:0 18px 45px rgba(15,23,42,.12);
      }

      .hb-trip-book h2{
        margin:0;
        color:#194C66;
        font-size:30px;
        font-weight:900;
      }

      .hb-trip-from{
        margin-top:18px;
        color:#64748b;
        font-size:14px;
        font-weight:700;
      }

      .hb-trip-price{
        margin-top:4px;
        font-size:38px;
        font-weight:950;
        color:#0f172a;
        letter-spacing:-.04em;
      }

      .hb-trip-book-note{
        margin-top:16px;
        padding:16px;
        border-radius:18px;
        background:#eafaf7;
        color:#006b5b;
        font-size:14px;
        line-height:1.6;
        font-weight:700;
      }

      .hb-trip-btn{
        margin-top:22px;
        width:100%;
        height:60px;
        border-radius:999px;
        background:#007764;
        color:#fff!important;
        display:flex;
        align-items:center;
        justify-content:center;
        text-decoration:none!important;
        font-weight:900;
        box-shadow:0 12px 26px rgba(0,119,100,.25);
        transition:.2s ease;
      }

      .hb-trip-btn:hover{
        transform:translateY(-2px);
        opacity:.95;
      }

      .hb-trip-list{
        display:grid;
        gap:12px;
        margin-top:20px;
        color:#475569;
        font-size:14px;
      }

      .hb-trip-list div{
        display:flex;
        gap:10px;
        align-items:flex-start;
      }

      .hb-trip-list span{
        color:#007764;
        font-weight:900;
      }

      .hb-trip-loading,
      .hb-trip-error{
        width:min(1180px,calc(100% - 40px));
        margin:80px auto;
        background:#fff;
        border-radius:30px;
        padding:40px;
        text-align:center;
        box-shadow:0 14px 35px rgba(15,23,42,.08);
      }

      .hb-trip-error{
        color:#b91c1c;
      }

      @media(max-width:980px){
        .hb-trip-hero{
          min-height:520px;
        }

        .hb-trip-topbar{
          grid-template-columns:1fr 1fr;
        }

        .hb-trip-wrap{
          grid-template-columns:1fr;
        }

        .hb-trip-book{
          position:relative;
          top:auto;
        }

        .hb-trip-date{
          grid-template-columns:64px 1fr;
        }

        .hb-trip-date-price{
          grid-column:2;
          text-align:left;
        }
      }

      @media(max-width:640px){
        .hb-trip-page{
          padding-bottom:40px;
        }

        .hb-trip-hero{
          min-height:500px;
        }

        .hb-trip-hero-inner{
          width:calc(100% - 28px);
          padding-bottom:52px;
        }

        .hb-trip-lead{
          font-size:16px;
        }

        .hb-trip-topbar{
          width:calc(100% - 28px);
          grid-template-columns:1fr;
          margin-top:-34px;
        }

        .hb-trip-wrap{
          width:calc(100% - 28px);
        }

        .hb-trip-card,
        .hb-trip-book{
          padding:24px;
          border-radius:24px;
        }

        .hb-trip-card h2{
          font-size:27px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  try {
    styleOnce();

    if (!slug || slug === "vara-resor") {
      throw new Error("Slug saknas.");
    }

    root.innerHTML = `<div class="hb-trip-loading">Laddar resa...</div>`;

    const res = await fetch(`${API_BASE}/api/public/sundra/trips/${encodeURIComponent(slug)}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Kunde inte hämta resa.");
    }

    const trip = json.trip;
    const departures = trip.departures || [];
    const next = trip.next_departure || departures[0] || null;
    const firstPrice = next?.price || trip.price_from || 0;

    root.innerHTML = `
      <div class="hb-trip-page">
        <section class="hb-trip-hero">
          ${
            trip.image_url
              ? `<img src="${safe(trip.image_url)}" alt="${safe(trip.title)}">`
              : ""
          }

          <div class="hb-trip-hero-inner">
            ${
              trip.campaign_label
                ? `<div class="hb-trip-kicker">${safe(trip.campaign_label)}</div>`
                : `<div class="hb-trip-kicker">Helsingbuss Resor</div>`
            }

            <h1 class="hb-trip-title">${safe(trip.title)}</h1>

            <p class="hb-trip-lead">
              ${safe(trip.short_description || "")}
            </p>
          </div>
        </section>

        <section class="hb-trip-topbar">
          <div class="hb-trip-info-pill">
            <div class="hb-trip-info-label">Destination</div>
            <div class="hb-trip-info-value">${safe(trip.destination || "Kommer snart")}</div>
          </div>

          <div class="hb-trip-info-pill">
            <div class="hb-trip-info-label">Nästa datum</div>
            <div class="hb-trip-info-value">${next ? formatShortDate(next.departure_date) : "Kommer snart"}</div>
          </div>

          <div class="hb-trip-info-pill">
            <div class="hb-trip-info-label">Pris från</div>
            <div class="hb-trip-info-value">${money(firstPrice)}</div>
          </div>

          <div class="hb-trip-info-pill">
            <div class="hb-trip-info-label">Platser kvar</div>
            <div class="hb-trip-info-value">${next?.seats_left ?? "—"}</div>
          </div>
        </section>

        <section class="hb-trip-wrap">
          <main>
            <div class="hb-trip-card">
              <h2>Om resan</h2>
              <div class="hb-trip-text">
                ${safe(trip.description || trip.short_description || "Mer information kommer snart.").replaceAll("\n", "<br>")}
              </div>
            </div>

            <div class="hb-trip-card">
              <h2>Välj datum</h2>

              <div class="hb-trip-dates">
                ${
                  departures.length
                    ? departures.map((dep) => `
                      <button class="hb-trip-date" type="button">
                        <div class="hb-trip-date-box">
                          ${formatShortDate(dep.departure_date)}
                        </div>

                        <div>
                          <div class="hb-trip-date-title">
                            ${formatDate(dep.departure_date)}
                          </div>

                          <div class="hb-trip-date-meta">
                            Avgång ${time(dep.departure_time)}
                            ${dep.return_time ? ` · Retur ${time(dep.return_time)}` : ""}
                          </div>
                        </div>

                        <div class="hb-trip-date-price">
                          ${money(dep.price || trip.price_from)}
                          <span class="hb-trip-date-seats">
                            ${dep.seats_left ?? 0} platser kvar
                          </span>
                        </div>
                      </button>
                    `).join("")
                    : `<div class="hb-trip-text">Inga bokningsbara datum finns just nu.</div>`
                }
              </div>
            </div>
          </main>

          <aside class="hb-trip-book">
            <h2>Boka resa</h2>

            <div class="hb-trip-from">Pris från</div>
            <div class="hb-trip-price">${money(firstPrice)}</div>

            <div class="hb-trip-book-note">
              Välj datum och fortsätt till bokningen. Där fyller du i resenärer, kontaktuppgifter och betalning.
            </div>

            <a class="hb-trip-btn" href="https://kund.helsingbuss.se/vara-resor/${safe(trip.slug)}">
              Fortsätt till bokning
            </a>

            <div class="hb-trip-list">
              <div><span>✓</span> Trygg bokning</div>
              <div><span>✓</span> Tydliga avgångar</div>
              <div><span>✓</span> Bekväm resa med Helsingbuss</div>
              <div><span>✓</span> Betalning via säker checkout</div>
            </div>
          </aside>
        </section>
      </div>
    `;
  } catch (e) {
    console.error("Sundra trip detail error:", e);

    root.innerHTML = `
      <div class="hb-trip-error">
        Kunde inte ladda resan. Kontrollera att resan är publicerad i portalen.
      </div>
    `;
  }
})();
