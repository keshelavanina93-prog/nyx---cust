/**
 * pnpm xml:diff <sample.xml> [--values] [--ours <ours.xml>]
 * Builds our SAD XML from the test sample model (or uses --ours) and structurally diffs it against a
 * real sample exported from eCustoms. Exit 1 if critical differences exist (brief §7).
 */
import { promises as fs } from "node:fs";
import { buildSadXml } from "../src/lib/export/sad-xml/builder";
import { parseXml, diffXml } from "../src/lib/export/sad-xml/diff";
import { sampleModel } from "../tests/unit/xml.test";

const args = process.argv.slice(2);
const samplePath = args.find((a) => !a.startsWith("--"));
if (!samplePath) {
  console.error("usage: pnpm xml:diff <sample.xml> [--values] [--ours <ours.xml>]");
  process.exit(2);
}
const oursIdx = args.indexOf("--ours");
const oursXml = oursIdx >= 0 ? await fs.readFile(args[oursIdx + 1]!, "utf8") : buildSadXml(sampleModel);
const sampleXml = await fs.readFile(samplePath, "utf8");
const report = diffXml(parseXml(oursXml), parseXml(sampleXml), { compareValues: args.includes("--values") });

console.log(`compared ${report.compared} nodes · ${report.total} differences · ${report.critical} critical`);
for (const e of report.entries.slice(0, 200)) console.log(`${e.kind.padEnd(8)} ${e.path}  ${e.detail}`);
if (report.entries.length > 200) console.log(`… ${report.entries.length - 200} more`);
process.exit(report.critical > 0 ? 1 : 0);
