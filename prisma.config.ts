import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  // Generation/build requires no database; runtime and migration jobs must set DATABASE_URL.
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/realitna",
  },
});
