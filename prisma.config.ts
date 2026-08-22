import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env for CLI commands
process.loadEnvFile?.();

const connectionString =
  process.env.DATABASE_URL ??
  (() => {
    throw new Error("DATABASE_URL environment variable is not set");
  })();

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma/schema.prisma"),
  datasource: {
    url: connectionString,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
