const fs = require("fs");

const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// Backup
fs.writeFileSync(p + ".BAK_" + Date.now(), s, "utf8");

// 1) Ta bort ALLA gamla block som börjar med HB_SERVICECARDS_WIDTH_START/END (de har varit trasiga och skapar kaos)
s = s.replace(/\/\*\s*HB_SERVICECARDS_WIDTH_START\s*\*\/[\s\S]*?\/\*\s*HB_SERVICECARDS_WIDTH_END\s*\*\//g, "");

// 2) Ta bort gamla hb-servicecards regler (system #2)
s = s.replace(/\.hb-servicecards[\s\S]*?\}\s*/g, (m) => {
  // Tar bort block som definierar hb-servicecards*, men lämna annat
  return "";
});

// 3) Ta bort ev gamla visibility-markers om de finns
s = s.replace(/\/\*\s*HB_SERVICECARDS_VISIBILITY_START\s*\*\/[\s\S]*?\/\*\s*HB_SERVICECARDS_VISIBILITY_END\s*\*\//g, "");

// 4) Lägg tillbaka EN korrekt visibility-regel längst ner (vinner alltid)
s += `

/* HB_SERVICECARDS_VISIBILITY_START */
.hb-desktop-only { display: none; }
.hb-mobile-only { display: block; }

/* Desktop: visa grid, dölj karusell */
@media (min-width: 980px) {
  .hb-desktop-only { display: block; }
  .hb-mobile-only { display: none; }
}
/* HB_SERVICECARDS_VISIBILITY_END */
`;

fs.writeFileSync(p, s, "utf8");
console.log("OK: globals.css rensad från system #2 + EN visibility-regel tillagd längst ner.");
