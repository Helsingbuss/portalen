const fs = require("fs");

const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// Ta bort kommentarer så räknaren inte blir knas
const withoutComments = s.replace(/\/\*[\s\S]*?\*\//g, "");

// Räkna { och }
const opens = (withoutComments.match(/\{/g) || []).length;
const closes = (withoutComments.match(/\}/g) || []).length;

const diff = opens - closes;

console.log("Braces:", { opens, closes, diff });

if (diff > 0) {
  // Lägg till saknade } längst ner
  s += "\n\n/* AUTO-FIX: added missing closing braces */\n";
  s += Array(diff).fill("}").join("\n") + "\n";
  fs.writeFileSync(p, s, "utf8");
  console.log("OK: Added", diff, "missing } at end of globals.css");
} else if (diff === 0) {
  console.log("OK: No missing braces detected.");
} else {
  console.log("WARNING: More } than { (diff < 0). Då finns extra } någonstans.");
}
