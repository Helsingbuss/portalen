const fs = require("fs");

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,s){ fs.writeFileSync(p,s,"utf8"); }

const globalsPath = "apps/site/app/globals.css";
const cardsPath   = "apps/site/components/sections/ServiceCards.tsx";

/* =========================
   1) FIX globals.css
   - Ta bort ALLT "hb-servicecards" (#2-system)
   - Ta bort gamla visibility-block
   - Lägg ETT korrekt block längst ner
========================= */
let g = read(globalsPath);

// ta bort alla rader/block som nämner hb-servicecards
g = g.replace(/^[^\n]*hb-servicecards[^\n]*\n?/gmi, "");

// ta bort gamla HB: service cards visibility block (om det finns)
g = g.replace(/\/\*\s*HB:\s*service cards visibility\s*\*\/[\s\S]*?\*\/\s*\n?/gmi, "");
g = g.replace(/\/\*\s*HB:\s*service cards visibility\s*\*\/[\s\S]*?@media\s*\(min-width:\s*980px\)\s*\{[\s\S]*?\}\s*/gmi, "");

// ta bort tidigare marker-block om de finns
g = g.replace(/\/\*\s*HB_SERVICECARDS_VISIBILITY_START\s*\*\/[\s\S]*?\/\*\s*HB_SERVICECARDS_VISIBILITY_END\s*\*\/\s*/gmi, "");

// lägg korrekt block LÄNGST NER (vinner alltid)
g += `

/* HB_SERVICECARDS_VISIBILITY_START */
.hb-desktop-only { display: none; }
.hb-mobile-only  { display: block; }

/* Desktop: visa grid, dölj karusell */
@media (min-width: 980px) {
  .hb-desktop-only { display: block; }
  .hb-mobile-only  { display: none; }
}
/* HB_SERVICECARDS_VISIBILITY_END */
`;

write(globalsPath, g);
console.log("OK: globals.css rensad + 1 visibility-regel längst ner.");


/* =========================
   2) FIX ServiceCards.tsx
   - Se till att du bara renderar EN desktop wrapper + EN mobile wrapper
   - Wrapper-klasser: hb-desktop-only / hb-mobile-only
   (Vi tar INTE dina mått / typsnitt)
========================= */
let s = read(cardsPath);

// 2a) Om du råkat ha dubbla render-block pga "desktop only" + "mobile only" kopierats,
// så löser vi det genom att:
 // - se till att första wrappern som innehåller desktop-grid får hb-desktop-only
 // - se till att wrappern som innehåller mobil/scroll får hb-mobile-only

// Byt eventuella hb-servicecards-klasser till rätt
s = s.replace(/hb-servicecards\s+hb-desktop/g, "hb-desktop-only");
s = s.replace(/hb-servicecards\s+hb-mobile/g, "hb-mobile-only");

// Om någon wrapper redan har className med hb-desktop-only/hb-mobile-only + annat, normalisera:
s = s.replace(/className\s*=\s*\"[^\"]*hb-desktop-only[^\"]*\"/g, 'className="hb-desktop-only"');
s = s.replace(/className\s*=\s*\"[^\"]*hb-mobile-only[^\"]*\"/g, 'className="hb-mobile-only"');

// 2b) Om du har 2 desktop-wrappers eller 2 mobile-wrappers kvar,
// ta bort den andra förekomsten genom att göra EN hård men säker fix:
// - behåll första "hb-desktop-only" blocket
// - behåll första "hb-mobile-only" blocket
// - om det finns fler: radera dem

function removeDuplicateWrapper(code, className){
  const re = new RegExp(`<div[^>]*className=\\"${className}\\"[^>]*>[\\s\\S]*?<\\/div>`, "g");
  const matches = code.match(re);
  if (!matches || matches.length <= 1) return code;

  // behåll första, ta bort resten
  let kept = false;
  code = code.replace(re, (m) => {
    if (!kept) { kept = true; return m; }
    return ""; // ta bort
  });
  return code;
}

s = removeDuplicateWrapper(s, "hb-desktop-only");
s = removeDuplicateWrapper(s, "hb-mobile-only");

write(cardsPath, s);
console.log("OK: ServiceCards.tsx wrappers rensade (ingen dubbel render).");
