const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const errors = [];
const warnings = [];
const ok = [];

function exists(file) {
  return fs.existsSync(file);
}

function okMsg(message) {
  ok.push(message);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  errors.push(message);
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function existsAny(files, label) {
  const found = files.find(exists);

  if (found) {
    okMsg("Finns: " + label + " -> " + found);
    return true;
  }

  fail("Saknas: " + label + " -> " + files.join(" eller "));
  return false;
}

function mustContain(file, needle, label) {
  const content = read(file);

  if (!content) {
    fail("Kan inte läsa: " + file);
    return;
  }

  if (content.includes(needle)) {
    okMsg("OK: " + label);
  } else {
    fail("Saknas i " + file + ": " + label);
  }
}

function warnIfContains(file, needle, label) {
  const content = read(file);

  if (content.includes(needle)) {
    warn(label + " i " + file);
  }
}

function countOccurrences(file, needle) {
  const content = read(file);

  if (!content) return 0;

  return content.split(needle).length - 1;
}

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;

  for (const item of fs.readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(item)) continue;

    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, result);
    } else {
      result.push(full);
    }
  }

  return result;
}

function checkPageRoute(route) {
  const base = "src/pages" + route;

  existsAny(
    [
      base + ".tsx",
      base + ".ts",
      base + "/index.tsx",
      base + "/index.ts",
    ],
    "Sida " + route
  );
}

function checkApiRoute(route) {
  const base = "src/pages/api" + route;

  existsAny(
    [
      base + ".ts",
      base + "/index.ts",
    ],
    "API " + route
  );
}

function runCommand(command, label) {
  console.log("");
  console.log("▶ " + label);
  console.log(command);
  console.log("");

  const result = cp.spawnSync(command, {
    stdio: "inherit",
    shell: true,
  });

  if (result.status === 0) {
    okMsg(label + " lyckades.");
  } else {
    fail(label + " misslyckades.");
  }
}

console.log("");
console.log("======================================");
console.log(" Kontroll av Ekonomi-modulen");
console.log("======================================");
console.log("");

const pageRoutes = [
  "/admin/ekonomi/oversikt",
  "/admin/ekonomi/bank",
  "/admin/ekonomi/fakturor",
  "/admin/ekonomi/fakturor/[id]",
  "/admin/ekonomi/fakturor/[id]/preview",
  "/admin/ekonomi/fakturor/[id]/print",
  "/admin/ekonomi/fakturor/gammal-betald",
  "/faktura/[token]",

  "/admin/ekonomi/leverantorsreskontra",
  "/admin/ekonomi/leverantorsreskontra/[id]",
  "/admin/ekonomi/resultat-uppdrag",

  "/admin/ekonomi/momsrapport",
  "/admin/ekonomi/betalningskontroll",
  "/admin/ekonomi/betalningspaminnelser",
  "/admin/ekonomi/installningar",

  "/admin/ekonomi/avprickning",
  "/admin/ekonomi/bankhandelser",
  "/admin/ekonomi/bankhandelser/[id]",

  "/admin/ekonomi/kunder",
  "/admin/ekonomi/leverantorer",

  "/admin/ekonomi/bokforingsunderlag",
  "/admin/ekonomi/manadsrapport",
  "/admin/ekonomi/arsoversikt",
  "/admin/ekonomi/lasta-perioder",
  "/admin/ekonomi/paminnelseko",
];

for (const route of pageRoutes) {
  checkPageRoute(route);
}

const apiRoutes = [
  "/admin/ekonomi/fakturor",
  "/admin/ekonomi/fakturor/[id]",
  "/admin/ekonomi/fakturor/[id]/mark-paid",
  "/admin/ekonomi/fakturor/[id]/mark-reminder",
  "/admin/ekonomi/fakturor/[id]/send-reminder-email",
  "/admin/ekonomi/fakturor/[id]/resultat",
  "/public/faktura/[token]",

  "/admin/ekonomi/leverantorsreskontra",
  "/admin/ekonomi/leverantorsreskontra/[id]",
  "/admin/ekonomi/leverantorsreskontra/[id]/mark-paid",
  "/admin/ekonomi/leverantorsreskontra/[id]/attachment",
  "/admin/ekonomi/leverantorsreskontra/[id]/pdf",

  "/admin/ekonomi/resultat-uppdrag",
  "/admin/ekonomi/oversikt",
  "/admin/ekonomi/momsrapport",
  "/admin/ekonomi/betalningskontroll",
  "/admin/ekonomi/betalningspaminnelser",
  "/admin/ekonomi/installningar",

  "/admin/ekonomi/avprickning",
  "/admin/ekonomi/bankhandelser",
  "/admin/ekonomi/bankhandelser/auto-match",
  "/admin/ekonomi/bankhandelser/[id]/match",

  "/admin/ekonomi/kunder",
  "/admin/ekonomi/leverantorer",

  "/admin/ekonomi/bokforingsunderlag",
  "/admin/ekonomi/manadsrapport",
  "/admin/ekonomi/arsoversikt",
  "/admin/ekonomi/lasta-perioder",
  "/admin/ekonomi/paminnelseko",
];

for (const route of apiRoutes) {
  checkApiRoute(route);
}

const importantFiles = [
  "src/lib/companyFinance.ts",
  "src/lib/economySettings.ts",
  "src/lib/invoiceNumbering.ts",
  "src/lib/supplierInvoicePdf.ts",
  "src/components/ekonomi/InvoiceResultBox.tsx",
  "src/components/ekonomi/CustomerRegisterPicker.tsx",
  "src/components/ekonomi/SupplierRegisterPicker.tsx",
  "src/components/AdminMenu.tsx",
];

for (const file of importantFiles) {
  if (exists(file)) {
    okMsg("Finns: " + file);
  } else {
    fail("Saknas: " + file);
  }
}

const menuFile = "src/components/AdminMenu.tsx";

const requiredMenuLinks = [
  "/admin/ekonomi/oversikt",
  "/admin/ekonomi/bank",
  "/admin/ekonomi/fakturor",
  "/admin/ekonomi/leverantorsreskontra",
  "/admin/ekonomi/resultat-uppdrag",
  "/admin/ekonomi/momsrapport",
  "/admin/ekonomi/betalningskontroll",
  "/admin/ekonomi/betalningspaminnelser",
  "/admin/ekonomi/installningar",
  "/admin/ekonomi/avprickning",
  "/admin/ekonomi/bankhandelser",
  "/admin/ekonomi/kunder",
  "/admin/ekonomi/leverantorer",
  "/admin/ekonomi/bokforingsunderlag",
  "/admin/ekonomi/manadsrapport",
  "/admin/ekonomi/arsoversikt",
  "/admin/ekonomi/lasta-perioder",
  "/admin/ekonomi/paminnelseko",
];

for (const href of requiredMenuLinks) {
  mustContain(menuFile, 'href="' + href + '"', "Meny-länk " + href);
}

mustContain(
  "src/pages/admin/ekonomi/fakturor/[id].tsx",
  "CustomerRegisterPicker",
  "Kundregister kopplat till kundfaktura"
);

mustContain(
  "src/pages/admin/ekonomi/leverantorsreskontra/[id].tsx",
  "SupplierRegisterPicker",
  "Leverantörsregister kopplat till leverantörsfaktura"
);

mustContain(
  "src/pages/admin/ekonomi/fakturor/[id].tsx",
  "InvoiceResultBox",
  "Resultatbox kopplad till kundfaktura"
);

mustContain(
  "src/pages/admin/ekonomi/bankhandelser/index.tsx",
  "Auto-matcha bankhändelser",
  "Auto-match-knapp finns"
);

mustContain(
  "src/pages/admin/ekonomi/bankhandelser/index.tsx",
  "Matcha manuellt",
  "Manuell matchning från bankhändelselista finns"
);

mustContain(
  "src/pages/admin/ekonomi/leverantorsreskontra/[id].tsx",
  "Öppna internt PDF-underlag",
  "PDF-knapp för leverantörsfaktura finns"
);

warnIfContains(
  "src/pages/api/admin/ekonomi/manadsrapport/index.ts",
  'makeEmptyMonth("total")',
  "Risk för Invalid time value: makeEmptyMonth(\"total\") finns kvar"
);

const customerPickerCount = countOccurrences(
  "src/pages/admin/ekonomi/fakturor/[id].tsx",
  "CustomerRegisterPicker"
);

if (customerPickerCount > 2) {
  warn("CustomerRegisterPicker verkar finnas flera gånger i kundfakturasidan.");
}

const supplierPickerCount = countOccurrences(
  "src/pages/admin/ekonomi/leverantorsreskontra/[id].tsx",
  "SupplierRegisterPicker"
);

if (supplierPickerCount > 2) {
  warn("SupplierRegisterPicker verkar finnas flera gånger i leverantörssidan.");
}

const backupFiles = walk(".").filter((file) => file.includes(".backup-before-"));

if (backupFiles.length > 0) {
  warn("Det finns backup-filer som inte ska med till GitHub: " + backupFiles.length + " st");
}

const rootGeneratedScripts = fs
  .readdirSync(".")
  .filter((file) =>
    /^(create|fix|connect|ensure|add|upgrade|patch|improve|show)-.*\.js$/i.test(file)
  );

if (rootGeneratedScripts.length > 0) {
  warn("Det finns tillfälliga script i roten som normalt inte ska med till GitHub: " + rootGeneratedScripts.join(", "));
}

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  if (exists(file)) {
    warn(file + " finns lokalt. Kontrollera att den INTE hamnar i GitHub.");
  }
}

if (process.argv.includes("--typecheck")) {
  runCommand("npx tsc --noEmit", "TypeScript-kontroll");
}

if (process.argv.includes("--build")) {
  runCommand("npm run build", "Next build");
}

console.log("");
console.log("======================================");
console.log(" Resultat");
console.log("======================================");
console.log("");

console.log("✅ OK: " + ok.length);
console.log("⚠️ Varningar: " + warnings.length);
console.log("❌ Fel: " + errors.length);

if (warnings.length > 0) {
  console.log("");
  console.log("VARNINGAR:");
  for (const item of warnings) {
    console.log(" - " + item);
  }
}

if (errors.length > 0) {
  console.log("");
  console.log("FEL:");
  for (const item of errors) {
    console.log(" - " + item);
  }

  console.log("");
  console.log("Stoppar här. Fixa felen innan GitHub/push.");
  process.exit(1);
}

console.log("");
console.log("Allt ser bra ut i Ekonomi-kontrollen.");
process.exit(0);
