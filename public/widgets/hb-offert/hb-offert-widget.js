/**
 * Helsingbuss offert-widget
 * Här renderar vi din 2-stegs design och kopplar submit till samma flöde som tidigare (endpoint)
 * OBS: Vi fyller på exakt UI enligt din design i nästa steg.
 */
(function () {
  const root = document.getElementById("hb-offert-widget");
  if (!root) return;

  root.innerHTML = `
    <div style="max-width:920px;margin:0 auto;padding:12px;">
      <div style="border-radius:16px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:18px;">
        <div style="font-family:Open Sans,system-ui,Segoe UI,sans-serif;font-weight:700;font-size:16px;">
          Offertformulär laddas…
        </div>
        <div style="margin-top:8px;font-family:Open Sans,system-ui,Segoe UI,sans-serif;font-size:13px;opacity:.7;">
          Vi kopplar in din exakta design + steg 1/2 + tackvy härnäst.
        </div>
      </div>
    </div>
  `;

  // Enkel logg så vi ser att widgeten kör
  console.log("[HB OffertWidget] Mounted");
})();
