const fs = require("fs");
const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// Ersätt det trasiga blocket (selector-rader + bakgrundsraden) med korrekt CSS
// Den här matchar:
// .hb-section-bg,
// .hb-section,
// .hb-sectionTitle,
//   background: transparent !important;
s = s.replace(
  /\.hb-section-bg,\s*\r?\n\.hb-section,\s*\r?\n\.hb-sectionTitle,\s*\r?\n\s*background:\s*transparent\s*!important;\s*\r?\n?/m,
  `.hb-section-bg,
.hb-section,
.hb-sectionTitle {
  background: transparent !important;
}
`
);

// Om någon variant finns där sista kommat råkat hamna på annan rad:
s = s.replace(
  /\.hb-section-bg,\s*\r?\n\.hb-section,\s*\r?\n\.hb-sectionTitle\s*\r?\n\s*background:\s*transparent\s*!important;\s*\r?\n?/m,
  `.hb-section-bg,
.hb-section,
.hb-sectionTitle {
  background: transparent !important;
}
`
);

fs.writeFileSync(p, s, "utf8");
console.log("OK: globals.css  fixade trasigt .hb-section* block.");
