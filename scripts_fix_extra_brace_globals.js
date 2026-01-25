const fs = require("fs");

const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// Hitta blocket och ta bort EN extra ensam "}" direkt efter blocket
// (dvs ... }\n}\n  -> ... }\n )
s = s.replace(
  /(\.hb-section-bg[\s\S]*?\.hb-sectionTitle\s*\{[\s\S]*?\}\s*)\}\s*(\r?\n)/m,
  "$1$2"
);

// Extra säkerhet: om det råkar ligga två "}" efter varandra generellt, ta bort en
// (men bara där det är "}\n}\n" med whitespace emellan)
s = s.replace(/\}\s*(\r?\n)\s*\}\s*(\r?\n)/m, "}$1$2");

fs.writeFileSync(p, s, "utf8");
console.log("OK: Tog bort extra } i globals.css");
