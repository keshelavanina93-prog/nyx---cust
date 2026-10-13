import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createTestDb, type Db } from "@/db/client";
import { dryRun, parseCsv } from "@/lib/tariff/csv";
import { importTariffCsv, getActiveTariffVersion } from "@/lib/tariff/import";
import { searchTariff, tokenize } from "@/lib/tariff/search";

let db: Db;
let csv: string;

beforeAll(async () => {
  db = await createTestDb();
  csv = await fs.readFile(path.join(process.cwd(), "src/db/seed/tariff.placeholder.csv"), "utf8");
});

describe("tariff csv", () => {
  it("parses quoted fields", () => {
    expect(parseCsv('a,"b,c","d ""e"""\n1,2,3')).toEqual([["a", "b,c", 'd "e"'], ["1", "2", "3"]]);
  });
  it("dry run detects placeholder and validates", () => {
    const r = dryRun(csv);
    expect(r.errors).toEqual([]);
    expect(r.valid.length).toBeGreaterThanOrEqual(50);
    expect(r.isPlaceholder).toBe(true);
    expect(r.hierarchy.chapters).toBeGreaterThan(10);
  });
  it("rejects bad HS and duplicates", () => {
    const bad = "hs_code,description_ka,duty_rate\n123,x,5\n6302510000,y,12\n6302510000,z,12\n6302520000,w,150";
    const r = dryRun(bad);
    expect(r.errors.map((e) => e.line)).toEqual([2, 5]);
    expect(r.duplicates).toEqual(["6302510000"]);
    expect(r.valid.length).toBe(1);
  });
  it("column mapping", () => {
    const r = dryRun("code,name,rate\n6302510000,linen,12", { hs_code: "code", description_ka: "name", duty_rate: "rate" });
    expect(r.valid[0]?.hs_code).toBe("6302510000");
  });
});

describe("tariff import + search", () => {
  it("imports as new version and activates; re-import is idempotent", async () => {
    const r1 = await importTariffCsv(db, csv, { source: "placeholder", effectiveFrom: "2026-01-01" });
    expect(r1.isPlaceholder).toBe(true);
    const r2 = await importTariffCsv(db, csv, { source: "placeholder", effectiveFrom: "2026-01-01" });
    expect(r2.versionId).toBe(r1.versionId);
    const active = await getActiveTariffVersion(db);
    expect(active?.id).toBe(r1.versionId);
  });
  it("full-text search finds table linen (en + ka)", async () => {
    const en = await searchTariff(db, "cotton table linen printed");
    expect(en.map((h) => h.hsCode)).toContain("6302510000");
    const ka = await searchTariff(db, "სუფრის თეთრეული ბამბის");
    expect(ka[0]?.hsCode).toBe("6302510000");
  });
  it("search by code prefix", async () => {
    const hits = await searchTariff(db, "8471");
    expect(hits.some((h) => h.hsCode.startsWith("8471"))).toBe(true);
  });
  it("tokenize", () => {
    expect(tokenize("PVC floor-covering, rolls (2m)")).toEqual(["pvc", "floor-covering", "rolls", "2m"]);
  });
});
