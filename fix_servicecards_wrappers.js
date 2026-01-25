const fs = require("fs");

const p = "apps/site/components/sections/ServiceCards.tsx";
let s = fs.readFileSync(p, "utf8");
fs.writeFileSync(p + ".BAK_" + Date.now(), s, "utf8");

// Byt bort ev gamla hb-servicecards-klasser om de finns
s = s.replace(/hb-servicecards\s+hb-desktop/g, "hb-desktop-only");
s = s.replace(/hb-servicecards\s+hb-mobile/g, "hb-mobile-only");

// Om du redan har wrappers men med fel namn, normalisera:
s = s.replace(/className="[^"]*hb-desktop-only[^"]*"/g, 'className="hb-desktop-only"');
s = s.replace(/className="[^"]*hb-mobile-only[^"]*"/g, 'className="hb-mobile-only"');

// Om wrappers saknas helt: försök sätta dem på de två första stora containrarna vi hittar
// (Vi gör en försiktig patch: första wrapper => desktop, andra => mobile)
if (!s.includes('className="hb-desktop-only"') || !s.includes('className="hb-mobile-only"')) {
  // Försök hitta två wrappers typ <div ...> som innehåller grid/carousel
  // Vi letar efter första "<div" efter "return (" och märker den som desktop-only om den inte redan har hb-*
  const idxReturn = s.indexOf("return (");
  if (idxReturn !== -1) {
    const after = s.slice(idxReturn);

    // hitta första <div ...> efter return (
    const firstDiv = after.match(/<div[^>]*>/);
    if (firstDiv && !firstDiv[0].includes("hb-desktop-only") && !firstDiv[0].includes("hb-mobile-only")) {
      const patched = firstDiv[0].includes("className=")
        ? firstDiv[0].replace(/className="([^"]*)"/, 'className="hb-desktop-only $1"')
        : firstDiv[0].replace("<div", '<div className="hb-desktop-only"');
      s = s.replace(firstDiv[0], patched);
    }

    // hitta nästa <div ...> efter den första och märka som mobile-only
    const secondMatch = after.replace(firstDiv ? firstDiv[0] : "", "___REMOVED___").match(/<div[^>]*>/);
    if (secondMatch && !secondMatch[0].includes("hb-desktop-only") && !secondMatch[0].includes("hb-mobile-only")) {
      const patched2 = secondMatch[0].includes("className=")
        ? secondMatch[0].replace(/className="([^"]*)"/, 'className="hb-mobile-only $1"')
        : secondMatch[0].replace("<div", '<div className="hb-mobile-only"');
      s = s.replace(secondMatch[0], patched2);
    }
  }
}

fs.writeFileSync(p, s, "utf8");
console.log("OK: ServiceCards.tsx wrappers säkrade (hb-desktop-only / hb-mobile-only).");
