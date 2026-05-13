// public/widgets/sundra.js

(async function () {
  const API_BASE = "https://kund.helsingbuss.se";
  const SITE_BASE = "https://www.helsingbuss.se";

  const widgets = document.querySelectorAll("[data-sundra-widget]");

  if (!widgets.length) return;

  function formatPrice(value) {
    if (value == null) return "";

    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function formatDate(date) {
    if (!date) return "";

    try {
      return new Intl.DateTimeFormat("sv-SE", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T00:00:00`));
    } catch {
      return date;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cardTheme(theme) {
    switch (theme) {
      case "blue":
        return { bg: "#194C66", badge: "#cce7ff", badgeText: "#194C66" };

      case "green":
        return { bg: "#1f5c4d", badge: "#d7f5e8", badgeText: "#1f5c4d" };

      case "dark":
        return { bg: "#25292C", badge: "#ffffff", badgeText: "#25292C" };

      case "teal":
        return { bg: "#006A6A", badge: "#d9ffff", badgeText: "#006A6A" };

      default:
        return { bg: "#A61E22", badge: "#ffe4e4", badgeText: "#A61E22" };
    }
  }

  async function loadTrips(type = "all") {
    const res = await fetch(
      `${API_BASE}/api/public/sundra/trips?type=${encodeURIComponent(type)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Kunde inte hämta resor.");
    }

    return json.trips || [];
  }

  function createCard(trip) {
    const theme = cardTheme(trip.card_theme);

    const departureDate = trip.next_departure?.departure_date
      ? formatDate(trip.next_departure.departure_date)
      : "Fler datum";

    const price = trip.next_departure?.price || trip.price_from || null;

    const slug = escapeHtml(trip.slug || "");

    const href = `${SITE_BASE}/vara-resor/${slug}`;

    const imageUrl =
      trip.image_url || `${API_BASE}/placeholder.jpg`;

    return `
      <a
        href="${href}"
        class="hb-sundra-card"
        data-hb-trip-link="${href}"
      >
        <div class="hb-sundra-image-wrap">
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${escapeHtml(trip.title)}"
            class="hb-sundra-image"
            loading="lazy"
          />

          ${
            trip.card_badge
              ? `
                <div class="hb-sundra-badge">
                  ${escapeHtml(trip.card_badge)}
                </div>
              `
              : ""
          }

          ${
            trip.campaign_label
              ? `
                <div class="hb-sundra-save">
                  <div class="hb-sundra-save-top">
                    ${escapeHtml(trip.campaign_label)}
                  </div>

                  ${
                    trip.campaign_text
                      ? `
                        <div class="hb-sundra-save-bottom">
                          ${escapeHtml(trip.campaign_text)}
                        </div>
                      `
                      : ""
                  }
                </div>
              `
              : ""
          }
        </div>

        <div class="hb-sundra-content">
          <div
            class="hb-sundra-date"
            style="background:${theme.badge}; color:${theme.badgeText};"
          >
            ${escapeHtml(departureDate)}
          </div>

          <h3 class="hb-sundra-title">
            ${escapeHtml(trip.card_title || trip.title)}
          </h3>

          <p class="hb-sundra-text">
            ${escapeHtml(
              trip.card_description ||
              trip.short_description ||
              ""
            )}
          </p>

          <div class="hb-sundra-footer">
            <div>
              ${
                trip.price_subtext
                  ? `
                    <div class="hb-sundra-subtext">
                      ${escapeHtml(trip.price_subtext)}
                    </div>
                  `
                  : ""
              }

              <div class="hb-sundra-price">
                ${
                  trip.price_prefix
                    ? `
                      <span class="hb-sundra-price-prefix">
                        ${escapeHtml(trip.price_prefix)}
                      </span>
                    `
                    : ""
                }

                ${price ? formatPrice(price) : ""}

                ${
                  trip.price_suffix
                    ? `
                      <span class="hb-sundra-price-suffix">
                        ${escapeHtml(trip.price_suffix)}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

            <div
              class="hb-sundra-arrow"
              style="background:${theme.bg};"
            >
              →
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function widgetClass(type) {
    if (type === "featured") {
      return "hb-sundra-widget hb-sundra-featured";
    }

    return "hb-sundra-widget hb-sundra-all";
  }

  if (!document.getElementById("hb-sundra-widget-style")) {
    const style = document.createElement("style");

    style.id = "hb-sundra-widget-style";

    style.innerHTML = `
      .hb-sundra-widget{
        width:100%;
      }

      .hb-sundra-grid{
        display:grid;
        gap:22px;
        width:100%;
      }

      .hb-sundra-featured .hb-sundra-grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }

      .hb-sundra-all .hb-sundra-grid{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }

      @media (min-width:1500px){
        .hb-sundra-all .hb-sundra-grid{
          grid-template-columns:repeat(5,minmax(0,1fr));
        }
      }

      .hb-sundra-card{
        display:flex;
        flex-direction:column;
        min-width:0;
        background:#fff;
        border-radius:22px;
        overflow:hidden;
        text-decoration:none!important;
        box-shadow:0 10px 30px rgba(0,0,0,.08);
        transition:.25s ease;
        color:#0f172a;
        position:relative;
        cursor:pointer;
      }

      .hb-sundra-card:hover{
        transform:translateY(-4px);
        box-shadow:0 18px 40px rgba(0,0,0,.12);
      }

      .hb-sundra-image-wrap{
        position:relative;
        height:190px;
        overflow:hidden;
        background:#eef2f5;
      }

      .hb-sundra-featured .hb-sundra-image-wrap{
        height:210px;
      }

      .hb-sundra-image{
        width:100%;
        height:100%;
        object-fit:cover;
        transition:transform .4s ease;
        display:block;
      }

      .hb-sundra-card:hover .hb-sundra-image{
        transform:scale(1.04);
      }

      .hb-sundra-badge{
        position:absolute;
        left:14px;
        top:14px;
        background:#fff;
        color:#0f172a;
        font-size:12px;
        font-weight:700;
        border-radius:999px;
        padding:7px 12px;
      }

      .hb-sundra-save{
        position:absolute;
        right:14px;
        top:14px;
        background:#fff;
        border-radius:16px;
        padding:9px 12px;
        text-align:right;
        box-shadow:0 8px 20px rgba(0,0,0,.12);
      }

      .hb-sundra-save-top{
        font-size:12px;
        font-weight:700;
        color:#A61E22;
      }

      .hb-sundra-save-bottom{
        font-size:11px;
        color:#475569;
        margin-top:2px;
      }

      .hb-sundra-content{
        padding:18px;
      }

      .hb-sundra-date{
        display:inline-flex;
        align-items:center;
        border-radius:999px;
        padding:7px 12px;
        font-size:12px;
        font-weight:700;
        margin-bottom:12px;
      }

      .hb-sundra-title{
        font-size:20px;
        line-height:1.2;
        margin:0;
        font-weight:800;
        color:#0f172a;
      }

      .hb-sundra-featured .hb-sundra-title{
        font-size:22px;
      }

      .hb-sundra-text{
        margin-top:10px;
        font-size:14px;
        line-height:1.55;
        color:#475569;
        display:-webkit-box;
        -webkit-line-clamp:3;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }

      .hb-sundra-footer{
        margin-top:18px;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:12px;
      }

      .hb-sundra-subtext{
        font-size:11px;
        color:#64748b;
        margin-bottom:4px;
      }

      .hb-sundra-price{
        font-size:23px;
        font-weight:800;
        color:#0f172a;
      }

      .hb-sundra-featured .hb-sundra-price{
        font-size:26px;
      }

      .hb-sundra-price-prefix,
      .hb-sundra-price-suffix{
        font-size:13px;
        font-weight:600;
        color:#64748b;
      }

      .hb-sundra-arrow{
        width:46px;
        height:46px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-size:20px;
        font-weight:700;
        flex-shrink:0;
      }

      .hb-sundra-loading,
      .hb-sundra-empty,
      .hb-sundra-error{
        padding:30px;
        background:#fff;
        border-radius:20px;
        text-align:center;
        color:#475569;
        font-size:15px;
      }

      .hb-sundra-error{
        color:#b91c1c;
        background:#fff5f5;
      }

      @media (max-width:1100px){
        .hb-sundra-featured .hb-sundra-grid,
        .hb-sundra-all .hb-sundra-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }

      @media (max-width:768px){
        .hb-sundra-grid{
          display:flex;
          overflow-x:auto;
          gap:16px;
          padding:4px 18px 18px 4px;
          scroll-snap-type:x mandatory;
          -webkit-overflow-scrolling:touch;
        }

        .hb-sundra-grid::-webkit-scrollbar{
          display:none;
        }

        .hb-sundra-card{
          min-width:84%;
          max-width:84%;
          scroll-snap-align:start;
          border-radius:22px;
        }

        .hb-sundra-image-wrap,
        .hb-sundra-featured .hb-sundra-image-wrap{
          height:205px;
        }

        .hb-sundra-title,
        .hb-sundra-featured .hb-sundra-title{
          font-size:21px;
        }

        .hb-sundra-price,
        .hb-sundra-featured .hb-sundra-price{
          font-size:24px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  for (const widget of widgets) {
    const type =
      widget.getAttribute("data-sundra-widget") || "all";

    try {
      widget.className = `${widget.className || ""} ${widgetClass(type)}`.trim();

      widget.innerHTML = `
        <div class="hb-sundra-loading">
          Laddar resor...
        </div>
      `;

      const trips = await loadTrips(type);

      if (!trips.length) {
        widget.innerHTML = `
          <div class="hb-sundra-empty">
            Inga resor hittades.
          </div>
        `;
        continue;
      }

      widget.innerHTML = `
        <div class="hb-sundra-grid">
          ${trips.map(createCard).join("")}
        </div>
      `;
    } catch (e) {
      console.error("Sundra widget error:", e);

      widget.innerHTML = `
        <div class="hb-sundra-error">
          Kunde inte ladda resor.
        </div>
      `;
    }
  }

  document.addEventListener("click", function (e) {
    const card = e.target.closest(".hb-sundra-card");

    if (!card) return;

    const url =
      card.getAttribute("data-hb-trip-link") ||
      card.getAttribute("href");

    if (url) {
      e.preventDefault();
      window.location.href = url;
    }
  });
})();
