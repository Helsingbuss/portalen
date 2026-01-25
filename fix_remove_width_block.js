const fs = require("fs");

const p = "apps/site/app/globals.css";
let s = fs.readFileSync(p, "utf8");

// Ta bort allt mellan markers (inklusive markers)
const start = "/* HB_SERVICECARDS_WIDTH_START */";
const end = "/* HB_SERVICECARDS_WIDTH_END */";

const i = s.indexOf(start);
const j = s.indexOf(end);

if (i !== -1 && j !== -1 && j > i) {
  const before = s.slice(0, i);
  const after = s.slice(j + end.length);
  s = (before + "\n\n" + after).replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(p, s, "utf8");
  console.log("OK: Tog bort HB_SERVICECARDS_WIDTH-blocket från globals.css");
} else {
  console.log("Hittade inte blocket (marker saknas eller fel ordning). Inget ändrat.");
}
