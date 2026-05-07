// public/widgets/sundra.js

(async function () {
  const widgets = document.querySelectorAll("[data-sundra-widget]");

  if (!widgets.length) return;

  function formatPrice(value) {
    if (value == null) return "";

    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(date) {
    if (!date) return "";

    try {
      return new Intl.DateTimeFormat("sv-SE", {
        day: "numeric",
        month: "short",
      }).format(new Date(date));
    } catch {
      return date;
    }
  }

  function cardTheme(theme) {
    switch (theme) {
      case "blue":
        return {
          bg: "#194C66",
          badge: "#cce7ff",
          badgeText: "#194C66",
        };

      case "green":
        return {
          bg: "#1f5c4d",
          badge: "#d7f5e8",
          badgeText: "#1f5c4d",
        };

      case "dark":
        return {
          bg: "#25292C",
          badge: "#ffffff",
          badgeText: "#25292C",
        };

      case "teal":
        return {
          bg: "#006A6A",
          badge: "#d9ffff",
          badgeText: "#006A6A",
        };

      default:
        return {
          bg: "#A61E22",
          badge: "#ffe4e4",
          badgeText: "#A61E22",
        };
    }
  }

  async function loadTrips(type = "all") {
    const res = await fetch(
      `/api/public/sundra/trips?type=${encodeURIComponent(type)}`
    );

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || "Kunde inte hämta resor.");
    }

    return json.trips || [];
  }

  function createCard(trip) {
    const theme = cardTheme(trip.card_theme);

    const departureDate = trip.next_departure?.departure_date
      ? formatDate(trip.next_departure.departure_date)
      : "Fler datum";

    const price =
      trip.next_departure?.price || trip.price_from || null;

    const href = `/vara-resor/${trip.slug}`;

    return `
      <a href="${href}" class="hb-sundra-card">
        <div class="hb-sundra-image-wrap">
          <img
            src="${trip.image_url || "/placeholder.jpg"}"
            alt="${trip.title}"
            class="hb-sundra-image"
          />

          ${
            trip.card_badge
              ? `
            <div class="hb-sundra-badge">
              ${trip.card_badge}
            </div>
          `
              : ""
          }

          ${
            trip.campaign_label
              ? `
            <div class="hb-sundra-save">
              <div class="hb-sundra-save-top">
                ${trip.campaign_label}
              </div>

              ${
                trip.campaign_text
                  ? `
                <div class="hb-sundra-save-bottom">
                  ${trip.campaign_text}
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
            ${departureDate}
          </div>

          <h3 class="hb-sundra-title">
            ${trip.card_title || trip.title}
          </h3>

          <p class="hb-sundra-text">
            ${
              trip.card_description ||
              trip.short_description ||
              ""
            }
          </p>

          <div class="hb-sundra-footer">
            <div>
              ${
                trip.price_subtext
                  ? `
                <div class="hb-sundra-subtext">
                  ${trip.price_subtext}
                </div>
              `
                  : ""
              }

              <div class="hb-sundra-price">
                ${
                  trip.price_prefix
                    ? `
                  <span class="hb-sundra-price-prefix">
                    ${trip.price_prefix}
                  </span>
                `
                    : ""
                }

                ${price ? formatPrice(price) : ""}

                ${
                  trip.price_suffix
                    ? `
                  <span class="hb-sundra-price-suffix">
                    ${trip.price_suffix}
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

  for (const widget of widgets) {
    const type =
      widget.getAttribute("data-sundra-widget") || "all";

    try {
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
      console.error(e);

      widget.innerHTML = `
        <div class="hb-sundra-error">
          Kunde inte ladda resor.
        </div>
      `;
    }
  }

  const style = document.createElement("style");

  style.innerHTML = `
    .hb-sundra-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:24px;
    }

    .hb-sundra-card{
      display:flex;
      flex-direction:column;
      background:#fff;
      border-radius:24px;
      overflow:hidden;
      text-decoration:none;
      box-shadow:0 10px 30px rgba(0,0,0,.08);
      transition:.25s ease;
      color:#0f172a;
      position:relative;
    }

    .hb-sundra-card:hover{
      transform:translateY(-4px);
      box-shadow:0 18px 40px rgba(0,0,0,.12);
    }

    .hb-sundra-image-wrap{
      position:relative;
      height:240px;
      overflow:hidden;
    }

    .hb-sundra-image{
      width:100%;
      height:100%;
      object-fit:cover;
      transition:transform .4s ease;
    }

    .hb-sundra-card:hover .hb-sundra-image{
      transform:scale(1.04);
    }

    .hb-sundra-badge{
      position:absolute;
      left:16px;
      top:16px;
      background:#fff;
      color:#0f172a;
      font-size:13px;
      font-weight:700;
      border-radius:999px;
      padding:8px 14px;
    }

    .hb-sundra-save{
      position:absolute;
      right:16px;
      top:16px;
      background:#fff;
      border-radius:18px;
      padding:10px 14px;
      text-align:right;
      box-shadow:0 8px 20px rgba(0,0,0,.12);
    }

    .hb-sundra-save-top{
      font-size:13px;
      font-weight:700;
      color:#A61E22;
    }

    .hb-sundra-save-bottom{
      font-size:12px;
      color:#475569;
      margin-top:2px;
    }

    .hb-sundra-content{
      padding:22px;
    }

    .hb-sundra-date{
      display:inline-flex;
      align-items:center;
      border-radius:999px;
      padding:8px 14px;
      font-size:13px;
      font-weight:700;
      margin-bottom:14px;
    }

    .hb-sundra-title{
      font-size:24px;
      line-height:1.2;
      margin:0;
      font-weight:800;
      color:#0f172a;
    }

    .hb-sundra-text{
      margin-top:12px;
      font-size:15px;
      line-height:1.6;
      color:#475569;
    }

    .hb-sundra-footer{
      margin-top:22px;
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:14px;
    }

    .hb-sundra-subtext{
      font-size:12px;
      color:#64748b;
      margin-bottom:4px;
    }

    .hb-sundra-price{
      font-size:28px;
      font-weight:800;
      color:#0f172a;
    }

    .hb-sundra-price-prefix,
    .hb-sundra-price-suffix{
      font-size:14px;
      font-weight:600;
      color:#64748b;
    }

    .hb-sundra-arrow{
      width:52px;
      height:52px;
      border-radius:999px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-size:22px;
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

    @media (max-width:768px){
      .hb-sundra-grid{
        grid-template-columns:1fr;
      }

      .hb-sundra-title{
        font-size:22px;
      }

      .hb-sundra-image-wrap{
        height:220px;
      }
    }
  `;

  document.head.appendChild(style);
})();
