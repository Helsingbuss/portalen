const fs = require("fs");

const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// 1) Ta bort trasigt width-block (det du visade tidigare saknar selector)
s = s.replace(/\/\*\s*HB_SERVICECARDS_WIDTH_START\s*\*\/[\s\S]*?\/\*\s*HB_SERVICECARDS_WIDTH_END\s*\*\//gm, "");

// 2) Ta bort tidigare shadows-block om det finns (så vi inte får dubbelt/konflikt)
s = s.replace(/\/\*\s*HB_SERVICECARDS_SHADOWS_START\s*\*\/[\s\S]*?\/\*\s*HB_SERVICECARDS_SHADOWS_END\s*\*\//gm, "");

// 3) Lägg tillbaka korrekt shadows/border-regel (desktop on, mobil off)
const SHADOWS = `
/* HB_SERVICECARDS_SHADOWS_START */
/* Desktop: behåll premium shadow */
@media (min-width: 980px){
  .hb-servicecard{
    box-shadow: 0 16px 40px rgba(0,0,0,0.12);
    border: 1px solid rgba(255,255,255,0.65);
  }
}

/* Mobil: INGEN skugga + ingen vit linje */
@media (max-width: 979px){
  .hb-servicecard{
    box-shadow: none !important;
    border: none !important;
  }
}
/* HB_SERVICECARDS_SHADOWS_END */
`.trim();

// 4) Mobil ska ha samma bakgrund som desktop:
// Vi sätter en variabel och använder den för båda.
// (Om du redan har en bakgrund på desktop: detta gör att mobilen inte blir "vit")
const BG = `
/* HB_PAGE_BG_START */
:root{
  --hb-page-bg: #F3EDE5; /* byt om din desktop är annan – men detta gör mobil = desktop */
}
html, body{
  background: var(--hb-page-bg) !important;
}
/* HB_PAGE_BG_END */
`.trim();

// Ta bort tidigare BG-block om du redan råkat lägga in
s = s.replace(/\/\*\s*HB_PAGE_BG_START\s*\*\/[\s\S]*?\/\*\s*HB_PAGE_BG_END\s*\*\//gm, "");

// Lägg blocken längst ner så de alltid vinner
s = s.trimEnd() + "\n\n" + BG + "\n\n" + SHADOWS + "\n";

fs.writeFileSync(p, s, "utf8");
console.log("OK: globals.css städad (tog bort trasiga block) + mobilbakgrund satt + shadows fixad.");
