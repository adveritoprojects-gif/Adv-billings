import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __systemPrisma?: PrismaClient };

export const systemDb = globalForPrisma.__systemPrisma ?? new PrismaClient();

globalForPrisma.__systemPrisma = systemDb;
