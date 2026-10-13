/**
 * Seed reference data + placeholder tariff (+ demo org/user in dev).
 *   pnpm db:seed            → reference data + placeholder tariff
 *   pnpm db:seed -- --demo  → also demo org "demo" with demo@example.com as owner and sample price history
 */
import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db/client";
import { seedReference } from "../src/db/seed/reference";
import { importTariffCsv, getActiveTariffVersion } from "../src/lib/tariff/import";

const demo = process.argv.includes("--demo");

const db = await getDb();
await seedReference(db);
console.log("reference data ✓");

const active = await getActiveTariffVersion(db);
if (!active) {
  const csv = await fs.readFile(path.join(process.cwd(), "src/db/seed/tariff.placeholder.csv"), "utf8");
  const r = await importTariffCsv(db, csv, { source: "tariff.placeholder.csv (PLACEHOLDER — NOT REAL TARIFF DATA)", effectiveFrom: "2026-01-01" });
  console.log(`placeholder tariff ✓ (${r.lineCount} lines, placeholder=${r.isPlaceholder})`);
} else console.log(`tariff active: ${active.source}`);

if (demo) {
  const email = process.env.DEMO_EMAIL ?? "demo@example.com";
  let user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) [user] = await db.insert(schema.users).values({ email, name: "Demo", emailVerified: new Date() }).returning();
  let org = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, "demo") });
  if (!org) {
    [org] = await db.insert(schema.organizations).values({ name: "Demo Importer LLC", slug: "demo", taxId: "400000000", address: "Tbilisi" }).returning();
    await db.insert(schema.memberships).values({ organizationId: org!.id, userId: user!.id, role: "owner" });
    await db.insert(schema.ecustomsProfiles).values({ organizationId: org!.id });
    await db.insert(schema.suppliers).values({ organizationId: org!.id, name: "SYNTHETIC Textile Ltd", country: "TR", defaultIncoterm: "FOB", defaultCurrency: "USD", defaultOriginCountry: "TR" });
    // Value-risk history: 4 shipments of 6302510000 in the last 90 days at ~13 ₾/kg
    for (const [price, daysAgo] of [
      ["13.0000", 10],
      ["12.5000", 30],
      ["13.5000", 60],
      ["12.8000", 80],
    ] as const) {
      await db.insert(schema.priceReferences).values({ organizationId: org!.id, hsCode: "6302510000", originCountry: "TR", unitBasis: "per_kg", unitPriceGel: price, observedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10), source: "user_reference", note: "seed demo" });
    }
    console.log(`demo org ✓ (${email} / slug demo)`);
  } else console.log("demo org exists");
}
process.exit(0);
