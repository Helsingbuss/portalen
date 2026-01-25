const fs = require("fs");

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,s){ fs.writeFileSync(p, s.replace(/^\uFEFF/,""), "utf8"); }

const layoutPath = "apps/site/app/layout.tsx";
const cardsPath  = "apps/site/components/sections/ServiceCards.tsx";
const globalsPath = "apps/site/app/globals.css";

/** =========================
 *  A) Open Sans globalt (layout.tsx)
 *  ========================= */
let layout = read(layoutPath);

// Lägg in next/font/google Open Sans om den saknas
if (!layout.includes("next/font/google") || !layout.includes("Open_Sans")) {
  // 1) Import
  if (!layout.includes("next/font/google")) {
    layout = layout.replace(/from\s+["']next\/(.*)["'];/g, (m)=>m); // no-op
  }
  // Sätt in import efter ev. react/imports
  layout = layout.replace(
    /(import[\s\S]*?\n)(\n|export default|export const)/,
    (m, g1, g2) => {
      const extra = `import { Open_Sans } from "next/font/google";\n`;
      return g1 + extra + g2;
    }
  );

  // 2) Skapa font-konstant om den saknas
  if (!layout.includes("const openSans")) {
    layout = layout.replace(
      /(export\s+default\s+function\s+RootLayout[\s\S]*?\{)/,
      (m) => m + `\n  const openSans = Open_Sans({ subsets: ["latin"], weight: ["400","600","700"], display: "swap" });\n`
    );
  }
}

// 3) Applicera på <body className=...>
layout = layout.replace(
  /<body([^>]*?)className=\{?["']([^"'}]*)["']\}?([^>]*?)>/,
  (m, a, cls, b) => {
    if (cls.includes("openSans.className")) return m;
    // Behåll befintliga klasser men lägg openSans först
    return `<body${a}className={\`\${openSans.className} ${cls}\`}${b}>`;
  }
);

// Om body saknar className helt:
if (!layout.match(/<body[^>]*className=/)) {
  layout = layout.replace(/<body([^>]*)>/, `<body$1 className={openSans.className}>`);
}

write(layoutPath, layout);


/** =========================
 *  B) ServiceCards: lås dina mått + EN layout (desktop/mobil)
 *  ========================= */
let cards = read(cardsPath);

// Fixa konstiga tecken/BOM
cards = cards.replace(/^\uFEFF/, "");

// Lås dina mått (du sa: desktop 280, mobil 240, rubrik 16, text 12.5)
function forceConst(name, value) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*[^;]+;`);
  if (re.test(cards)) {
    cards = cards.replace(re, `const ${name} = ${value};`);
  } else {
    // Lägg in nära "HÄR ÄNDRAR DU..." om det finns
    cards = cards.replace(
      /(\/\/\s*=======\s*HÄR ÄNDRAR DU[\s\S]*?\n)/,
      `$1const ${name} = ${value};\n`
    );
  }
}

forceConst("DESKTOP_CARD_MAX", "280");
forceConst("MOBILE_CARD_WIDTH", "240");
forceConst("TITLE_FONT_PX", "16");
forceConst("BODY_FONT_PX", "12.5");
forceConst("ICON_SIZE", "50");

// Behåll gap som du ville ha i desktop (18 mellan boxarna)
forceConst("DESKTOP_GAP", "18");

// Behåll bildhöjd (du hade 140)
forceConst("IMAGE_H", "140");

// Blur-styrka (DU kan ändra senare)
if (!cards.includes("const IMAGE_BLUR_PX")) {
  cards = cards.replace(
    /const\s+IMAGE_H\s*=\s*140;?/,
    `const IMAGE_H = 140;\nconst IMAGE_BLUR_PX = 4; // ÄNDRA HÄR: 0 = inget blur, 2-4 lagom, 6+ mycket\n`
  );
} else {
  cards = cards.replace(/const\s+IMAGE_BLUR_PX\s*=\s*\d+;?/g, "const IMAGE_BLUR_PX = 4;");
}

// Se till att wrappers använder hb-desktop-only / hb-mobile-only (så INTE dubbelt)
cards = cards.replace(/className=["'][^"']*hb-servicecards[^"']*["']/g, (m) => m); // no-op if exists
cards = cards.replace(/className=["'][^"']*hb-desktop[^"']*["']/g, `className="hb-desktop-only"`);
cards = cards.replace(/className=["'][^"']*hb-mobile[^"']*["']/g, `className="hb-mobile-only"`);

// Om du har renderat två grids i samma komponent: ta bort en extra desktop grid-block om den råkat dupliceras.
// (En safe approach: om vi hittar två "hb-desktop-only" wrappers, ta bort den andra)
const desktopWraps = [...cards.matchAll(/className="hb-desktop-only"/g)];
if (desktopWraps.length > 1) {
  // Ta bort allt från andra wrapperns start till nästa syskon wrapper (grovt men brukar funka)
  const idx = desktopWraps[1].index;
  if (typeof idx === "number") {
    cards = cards.slice(0, idx) + cards.slice(idx).replace(/className="hb-desktop-only"[\s\S]*?<\/section>/, "");
  }
}

// Se till att knappar alltid hamnar på samma nivå: gör content flex + mt:auto på knappen
// (Byter bara om vi hittar style för content-wrapper)
cards = cards.replace(/(display:\s*"grid"[\s\S]*?)/g, (m)=>m); // no-op

// Lägg in en gemensam "content" styling om den finns som inline style objekt
cards = cards.replace(
  /(<div[^>]*\n\s*style=\{\{\n[\s\S]*?\}\}\n\s*>)/g,
  (block) => block
);

// Patch: där du har textcontainer style: lägg till flex-column och minHeight så allt blir lika högt.
// Vi letar efter 'padding: 18' och lägger in flex om den inte finns.
cards = cards.replace(
  /padding:\s*18,[\s\S]*?(?=})/g,
  (seg) => {
    if (seg.includes('display: "flex"')) return seg;
    return seg + `\n            display: "flex",\n            flexDirection: "column",\n            minHeight: 260, // håller korten lika höga\n          `;
  }
);

// Lägg blur på själva bilden (inte vit dim-linje). Vi söker image-wrapper style med overflow hidden.
cards = cards.replace(
  /filter:\s*"blur\(\d+px\)"/g,
  `filter: "blur(${4}px)"`
);

// Om du använder next/image: lägg style på Image (vi ersätter blur/transform på imgStyle om det finns)
cards = cards.replace(
  /style=\{\{\s*objectFit:\s*"cover"[\s\S]*?\}\}/g,
  (m) => {
    if (m.includes("filter:")) return m.replace(/filter:\s*"[^"]*"/, `filter: "blur(\${IMAGE_BLUR_PX}px)"`);
    return m.replace(/\}\}/, `,\n              filter: "blur(${"${IMAGE_BLUR_PX"}px)",\n              transform: "scale(1.04)"\n            }}`);
  }
);

// Ta bort vit “dim-linje”: gör overlay till mjukare och utan vit band vid nederkant
// (Vi sätter en overlay med mörk + guld ton, ingen vit fade)
cards = cards.replace(
  /background:\s*["'][^"']*linear-gradient\([^"']*["']/g,
  `background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.06) 55%, rgba(0,0,0,0.10) 100%), linear-gradient(90deg, rgba(214,179,92,0.10) 0%, rgba(255,255,255,0.00) 40%, rgba(214,179,92,0.08) 100%)"`
);

write(cardsPath, cards);


/** =========================
 *  C) globals.css: bara EN visibility-regel (desktop/mobil)
 *  ========================= */
let css = read(globalsPath);

// Rensa gammalt “system #2” om det finns
css = css.replace(/\/\*\s*=====\s*ServiceCards:[\s\S]*?\*\//g, "");
css = css.replace(/\.hb-servicecards\.hb-mobile[\s\S]*?\}\s*/g, "");
css = css.replace(/\.hb-servicecards\.hb-desktop[\s\S]*?\}\s*/g, "");

// Lägg EN marker-block längst ner (vinner alltid)
const start = "/* HB_SERVICECARDS_VISIBILITY_START */";
const end   = "/* HB_SERVICECARDS_VISIBILITY_END */";
const re = new RegExp(start + "[\\s\\S]*?" + end, "m");
css = css.replace(re, "");

css += `\n\n${start}\n.hb-desktop-only{ display:none; }\n.hb-mobile-only{ display:block; }\n\n@media (min-width: 980px){\n  .hb-desktop-only{ display:block; }\n  .hb-mobile-only{ display:none; }\n}\n${end}\n`;

write(globalsPath, css);

console.log("OK: globals.css återställd + OpenSans i layout.tsx + ServiceCards låsta mått/visning + mild blur");
