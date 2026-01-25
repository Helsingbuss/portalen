const fs = require("fs");
const p = "apps/site/components/sections/ServiceCards.tsx";
let s = fs.readFileSync(p, "utf8");
const before = s;

// Ta bort inline-styles som skapar skugga/linjer
s = s.split('boxShadow: "0 16px 40px rgba(0,0,0,0.12)",').join("");
s = s.split('border: "1px solid rgba(255,255,255,0.65)",').join("");
s = s.split('boxShadow: "0 10px 18px rgba(0,0,0,0.18)",').join("");

// Lägg className hb-servicecard på kort-wrappen om den saknas (en enkel och säker injektion)
if (!s.includes('className="hb-servicecard"')) {
  s = s.replace(
    'style={{\n            position: "relative",',
    'className="hb-servicecard" style={{\n            position: "relative",'
  );
}

fs.writeFileSync(p, s, "utf8");
console.log(before === s ? "OBS: Inga ändringar matchade (säg till så patchar jag exakt efter din fil)." : "OK: ServiceCards.tsx patchad (tog bort inline shadow/border + la hb-servicecard).");
