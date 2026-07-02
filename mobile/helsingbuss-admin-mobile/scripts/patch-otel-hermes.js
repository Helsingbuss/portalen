const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nodeModules = path.join(root, "node_modules");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const hits = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (item.name === ".cache") continue;
      hits.push(...walk(full));
      continue;
    }

    if (!/\.(js|cjs|mjs)$/.test(item.name)) continue;

    const text = fs.readFileSync(full, "utf8");

    if (text.includes("webpackIgnore: true")) {
      hits.push(full);
    }
  }

  return hits;
}

const files = walk(nodeModules);

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");

  const after = before.replace(
    /import\(\s*\/\*\s*webpackIgnore:\s*true\s*\*\/[\s\S]*?\)/g,
    "Promise.resolve(null)"
  );

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("Patched:", path.relative(root, file));
  }
}

console.log("patch-otel-hermes klar.");
