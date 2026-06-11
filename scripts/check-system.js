const fs = require("fs");

const requiredFiles = [
  "src/pages/admin/system/roller-behorigheter/index.tsx",
  "src/pages/admin/system/anvandare/[id].tsx",
  "src/pages/admin/system/notiser-mallar/index.tsx",
  "src/pages/admin/system/loggar-handelser/index.tsx",
  "src/pages/admin/system/foretagsinstallningar/index.tsx",
  "src/pages/admin/system/systemstatus/index.tsx",
  "src/pages/admin/system/api-nycklar/index.tsx",
  "src/pages/admin/system/webhookar/index.tsx",
  "src/pages/admin/system/dokumentation/index.tsx",
  "src/pages/admin/system/backup-aterstallning/index.tsx",
  "src/pages/admin/system/export-import/index.tsx",

  "src/pages/api/admin/system/roller-behorigheter/index.ts",
  "src/pages/api/admin/system/anvandare/[id].ts",
  "src/pages/api/admin/system/notiser-mallar/index.ts",
  "src/pages/api/admin/system/loggar-handelser/index.ts",
  "src/pages/api/admin/system/foretagsinstallningar/index.ts",
  "src/pages/api/admin/system/systemstatus/index.ts",
  "src/pages/api/admin/system/api-nycklar/index.ts",
  "src/pages/api/admin/system/webhookar/index.ts",
  "src/pages/api/admin/system/webhookar/test.ts",
  "src/pages/api/admin/system/dokumentation/index.ts",
  "src/pages/api/admin/system/backup-aterstallning/index.ts",
  "src/pages/api/admin/system/export-import/index.ts",
];

const menuLinks = [
  "/admin/system/roller-behorigheter",
  "/admin/system/notiser-mallar",
  "/admin/system/loggar-handelser",
  "/admin/system/foretagsinstallningar",
  "/admin/system/systemstatus",
  "/admin/system/api-nycklar",
  "/admin/system/webhookar",
  "/admin/system/dokumentation",
  "/admin/system/backup-aterstallning",
  "/admin/system/export-import",
];

let ok = 0;
let warnings = 0;
let errors = 0;

function pass(message) {
  ok++;
  console.log("✅ " + message);
}

function warn(message) {
  warnings++;
  console.log("⚠️ " + message);
}

function fail(message) {
  errors++;
  console.log("❌ " + message);
}

console.log("");
console.log("Kontrollerar System / inställningar...");
console.log("");

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    pass("Finns: " + file);
  } else {
    fail("Saknas: " + file);
  }
}

const menuFile = "src/components/AdminMenu.tsx";

if (fs.existsSync(menuFile)) {
  const menu = fs.readFileSync(menuFile, "utf8");

  for (const href of menuLinks) {
    if (menu.includes(href)) {
      pass("Meny-länk finns: " + href);
    } else {
      warn("Meny-länk saknas eller heter annorlunda: " + href);
    }
  }
} else {
  fail("Saknar menyfil: " + menuFile);
}

const forbiddenFiles = fs.readdirSync(".").filter((name) => {
  return (
    name.startsWith("create-system-") ||
    name.startsWith("add-company-logo-upload") ||
    name.startsWith("fix-duplicate-logo-ref") ||
    name.startsWith("hide-optional-profile-warnings") ||
    name.startsWith("fix-user-warning-syntax")
  );
});

if (forbiddenFiles.length > 0) {
  warn("Tillfälliga script finns kvar i roten: " + forbiddenFiles.join(", "));
} else {
  pass("Inga kända tillfälliga system-script i roten.");
}

console.log("");
console.log("Resultat:");
console.log("✅ OK: " + ok);
console.log("⚠️ Varningar: " + warnings);
console.log("❌ Fel: " + errors);

if (errors > 0) {
  process.exit(1);
}
