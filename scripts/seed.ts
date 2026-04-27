// ABOUTME: Seed script that creates a sample API key, domain, and contact so the dashboard isn't empty.
// Usage: npx tsx scripts/seed.ts

import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { apiKeys, contacts, domains } from "../src/lib/db/schema";

process.loadEnvFile?.(".env");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const needsSsl = connectionString.includes("amazonaws.com");
const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...\n");

  // ── API Key ────────────────────────────────────────────────────
  const plainKey = `ns_${randomUUID().replace(/-/g, "")}`;
  const tokenHash = createHash("sha256").update(plainKey).digest("hex");
  const tokenPreview = plainKey.slice(0, 10);

  await db.insert(apiKeys).values({
    name: "Default Key",
    tokenHash,
    tokenPreview,
    permission: "full_access",
  });

  console.log("Created API key:");
  console.log(`  ${plainKey}`);
  console.log("  (save this — it won't be shown again)\n");

  // ── Domain ─────────────────────────────────────────────────────
  const existingDomain = await db.query.domains.findFirst({
    where: eq(domains.name, "example.com"),
  });

  if (existingDomain) {
    console.log("Domain already exists: example.com\n");
  } else {
    await db.insert(domains).values({
      name: "example.com",
      status: "not_started",
    });

    console.log("Created domain: example.com\n");
  }

  // ── Contact ────────────────────────────────────────────────────
  const existingContact = await db.query.contacts.findFirst({
    where: eq(contacts.email, "test@example.com"),
  });

  if (existingContact) {
    console.log("Contact already exists: test@example.com\n");
  } else {
    await db.insert(contacts).values({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });

    console.log("Created contact: test@example.com\n");
  }

  console.log("Done! Start the dev server with: npm run dev");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
