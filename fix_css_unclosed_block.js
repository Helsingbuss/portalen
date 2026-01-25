const fs = require("fs");

const p = "apps/site/app/globals.css";
const backup = "apps/site/app/globals.css.BAK_" + Date.now();

let s = fs.readFileSync(p, "utf8");
fs.writeFileSync(backup, s, "utf8");

// Räkna klamrar (enkel men effektiv för att fixa Unclosed block)
const open = (s.match(/\{/g) || []).length;
const close = (s.match(/\}/g) || []).length;
const diff = open - close;

console.log("Braces:", { open, close, diff });

if (diff > 0) {
  s += "\n\n/* AUTO-FIX: closing missing blocks */\n" + Array(diff).fill("}").join("\n") + "\n";
  fs.writeFileSync(p, s, "utf8");
  console.log(`OK: La till ${diff} st '}' längst ner. Backup: ${backup}`);
} else if (diff === 0) {
  console.log("OK: Inga saknade '}' hittades. (Felet kan då vara annat, t.ex. trasig kommentar). Backup finns ändå:", backup);
} else {
  console.log("OBS: Du har fler '}' än '{' (diff < 0). Jag ändrar INTE automatiskt då. Backup:", backup);
}
