import { defineConfig } from "drizzle-kit";

process.loadEnvFile?.(".env");

const url = process.env.DATABASE_URL ?? "";
const needsSsl = url.includes("amazonaws.com");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: needsSsl && !url.includes("sslmode") ? `${url}?sslmode=require` : url,
  },
});
