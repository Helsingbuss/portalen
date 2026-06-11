const fs = require("fs");
const { execSync } = require("child_process");

const shouldTypecheck = process.argv.includes("--typecheck");

let ok = 0;
let warnings = [];
let errors = [];

function exists(file) {
  return fs.existsSync(file);
}

function checkFile(file, label) {
  if (exists(file)) {
    ok++;
  } else {
    errors.push("Saknas: " + label + " -> " + file);
  }
}

function checkMenuLink(href, label) {
  const menuFile = "src/components/AdminMenu.tsx";

  if (!exists(menuFile)) {
    errors.push("Saknar AdminMenu.tsx");
    return;
  }

  const menu = fs.readFileSync(menuFile, "utf8");

  if (menu.includes(`href="${href}"`)) {
    ok++;
  } else {
    warnings.push("Menylänk saknas/verkar saknas: " + label + " -> " + href);
  }
}

console.log("");
console.log("======================================");
console.log(" Kontroll av Rapporter & analys");
console.log("======================================");
console.log("");

const pages = [
  ["src/pages/admin/rapporter-analys/index.tsx", "Rapporter översikt"],
  ["src/pages/admin/rapporter-analys/salda-biljetter/index.tsx", "Sålda biljetter"],
  ["src/pages/admin/rapporter-analys/intaktsrapport/index.tsx", "Intäktsrapport"],
  ["src/pages/admin/rapporter-analys/agentrapport/index.tsx", "Agentrapport"],
  ["src/pages/admin/rapporter-analys/forarrapport/index.tsx", "Förarrapport"],
  ["src/pages/admin/rapporter-analys/operatorrapport/index.tsx", "Operatörsrapport"],
  ["src/pages/admin/rapporter-analys/belaggning-kapacitet/index.tsx", "Beläggning & kapacitet"],
  ["src/pages/admin/rapporter-analys/kundanalys/index.tsx", "Kundanalys"],
  ["src/pages/admin/rapporter-analys/per-vecka/index.tsx", "Per vecka"],
  ["src/pages/admin/rapporter-analys/per-manad/index.tsx", "Per månad"],
  ["src/pages/admin/rapporter-analys/per-produkt/index.tsx", "Per produkt"],
];

const apis = [
  ["src/pages/api/admin/rapporter-analys/oversikt/index.ts", "API översikt"],
  ["src/pages/api/admin/rapporter-analys/salda-biljetter/index.ts", "API sålda biljetter"],
  ["src/pages/api/admin/rapporter-analys/intaktsrapport/index.ts", "API intäktsrapport"],
  ["src/pages/api/admin/rapporter-analys/agentrapport/index.ts", "API agentrapport"],
  ["src/pages/api/admin/rapporter-analys/forarrapport/index.ts", "API förarrapport"],
  ["src/pages/api/admin/rapporter-analys/operatorrapport/index.ts", "API operatörsrapport"],
  ["src/pages/api/admin/rapporter-analys/belaggning-kapacitet/index.ts", "API beläggning & kapacitet"],
  ["src/pages/api/admin/rapporter-analys/kundanalys/index.ts", "API kundanalys"],
  ["src/pages/api/admin/rapporter-analys/per-vecka/index.ts", "API per vecka"],
  ["src/pages/api/admin/rapporter-analys/per-manad/index.ts", "API per månad"],
  ["src/pages/api/admin/rapporter-analys/per-produkt/index.ts", "API per produkt"],
];

const links = [
  ["/admin/rapporter-analys", "Översikt"],
  ["/admin/rapporter-analys/salda-biljetter", "Sålda biljetter"],
  ["/admin/rapporter-analys/intaktsrapport", "Intäktsrapport"],
  ["/admin/rapporter-analys/agentrapport", "Agentrapport"],
  ["/admin/rapporter-analys/forarrapport", "Förarrapport"],
  ["/admin/rapporter-analys/operatorrapport", "Operatörsrapport"],
  ["/admin/rapporter-analys/belaggning-kapacitet", "Beläggning & kapacitet"],
  ["/admin/rapporter-analys/kundanalys", "Kundanalys"],
  ["/admin/rapporter-analys/per-vecka", "Per vecka"],
  ["/admin/rapporter-analys/per-manad", "Per månad"],
  ["/admin/rapporter-analys/per-produkt", "Per produkt"],
];

for (const [file, label] of pages) checkFile(file, label);
for (const [file, label] of apis) checkFile(file, label);
for (const [href, label] of links) checkMenuLink(href, label);

const backupFiles = [];
const tempScripts = [];

function walk(dir) {
  if (!exists(dir)) return;

  for (const item of fs.readdirSync(dir)) {
    const full = dir + "/" + item;
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(item)) continue;
      walk(full);
    } else {
      if (item.includes(".backup-before-")) backupFiles.push(full);
    }
  }
}

walk(".");

for (const item of fs.readdirSync(".")) {
  if (
    item.endsWith(".js") &&
    (
      item.startsWith("create-report-") ||
      item.startsWith("fix-business-area-") ||
      item.startsWith("create-reports-")
    )
  ) {
    tempScripts.push(item);
  }
}

if (backupFiles.length > 0) {
  warnings.push("Det finns backup-filer som inte ska med till GitHub: " + backupFiles.length + " st");
}

if (tempScripts.length > 0) {
  warnings.push("Det finns tillfälliga script i roten: " + tempScripts.join(", "));
}

if (exists(".env.local")) {
  warnings.push(".env.local finns lokalt. Kontrollera att den INTE hamnar i GitHub.");
}

if (exists(".env")) {
  warnings.push(".env finns lokalt. Kontrollera att den INTE hamnar i GitHub.");
}

if (shouldTypecheck) {
  console.log("▶ TypeScript-kontroll");
  console.log("npx tsc --noEmit");
  console.log("");

  try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    ok++;
  } catch (err) {
    errors.push("TypeScript-kontrollen misslyckades.");
  }
}

console.log("");
console.log("======================================");
console.log(" Resultat");
console.log("======================================");
console.log("");
console.log("✅ OK:", ok);
console.log("⚠️ Varningar:", warnings.length);
console.log("❌ Fel:", errors.length);

if (warnings.length > 0) {
  console.log("");
  console.log("VARNINGAR:");
  for (const warning of warnings) console.log(" - " + warning);
}

if (errors.length > 0) {
  console.log("");
  console.log("FEL:");
  for (const error of errors) console.log(" - " + error);
  process.exit(1);
}

console.log("");
console.log("Allt ser bra ut i Rapporter & analys-kontrollen.");
