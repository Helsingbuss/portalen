import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // 🔥 Tvingar klassisk Prisma (inte accelerate/driver mode)
  engine: "binary",

  migrations: {
    path: "prisma/migrations",
  },
});
