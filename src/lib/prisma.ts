import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(); // ⚠️ INGA options här!

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
