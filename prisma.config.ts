import "dotenv/config";

let defineConfigFn: any;

try {
  // Försök använda prisma/config (om det finns)
  defineConfigFn = require("prisma/config").defineConfig;
} catch (e) {
  // fallback om det inte finns
  defineConfigFn = (config: any) => config;
}

export default defineConfigFn({
  schema: "prisma/schema.prisma",

  // 🔥 Behåller din inställning
  engine: "binary",

  migrations: {
    path: "prisma/migrations",
  },
});
