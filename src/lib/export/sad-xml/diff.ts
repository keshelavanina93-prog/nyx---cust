/**
 * Structural XML diff for `pnpm xml:diff` (brief §7.3): compares element paths, order, attributes,
 * and (optionally) values between our generated XML and a real sample exported from eCustoms.
 */
import { create } from "xmlbuilder2";

export type XmlNode = { path: string; name: string; order: number; attrs: Record<string, string>; text: string | null; children: XmlNode[] };

export function parseXml(xml: string): XmlNode {
  const doc = create(xml);
  const obj = doc.end({ format: "object" }) as Record<string, unknown>;
  const rootName = Object.keys(obj)[0]!;
  return toNode(rootName, obj[rootName], rootName, 0);
}

function toNode(name: string, raw: unknown, path: string, order: number): XmlNode {
  const node: XmlNode = { path, name, order, attrs: {}, text: null, children: [] };
  if (raw === null || raw === undefined) return node;
  if (typeof raw !== "object") {
    node.text = String(raw);
    return node;
  }
  const o = raw as Record<string, unknown>;
  let idx = 0;
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith("@")) node.attrs[k.slice(1)] = String(v);
    else if (k === "#") node.text = String(v);
    else if (k.startsWith("!") || k.startsWith("?")) continue;
    else if (Array.isArray(v)) {
      v.forEach((item, i) => node.children.push(toNode(k, item, `${path}/${k}[${i + 1}]`, idx++)));
    } else node.children.push(toNode(k, v, `${path}/${k}`, idx++));
  }
  return node;
}

export type DiffEntry = { kind: "missing" | "extra" | "order" | "attr" | "value"; path: string; detail: string };

export type DiffReport = { entries: DiffEntry[]; critical: number; total: number; compared: number };

const CRITICAL = /Commodity_code|Precision_1|Customs_clearance_office_code|Type_of_declaration|Extended_customs_procedure|Consignee_code|Declarant_code|Currency_code|Currency_rate|Country_of_origin_code|Description_of_goods|Net_weight_itm|Gross_weight_itm|Item_price|Total_CIF_itm|Tax_code|Tax_amount|Total_number_of_items/;

export function diffXml(ours: XmlNode, sample: XmlNode, opts: { compareValues?: boolean } = {}): DiffReport {
  const entries: DiffEntry[] = [];
  let compared = 0;
  const walk = (a: XmlNode | undefined, b: XmlNode | undefined, path: string) => {
    if (!a && !b) return;
    if (!a) return entries.push({ kind: "missing", path, detail: `present in sample, missing in ours` });
    if (!b) return entries.push({ kind: "extra", path, detail: `present in ours, not in sample` });
    compared++;
    for (const k of Object.keys(b.attrs)) if (!(k in a.attrs)) entries.push({ kind: "attr", path, detail: `attribute @${k} missing` });
    if (opts.compareValues && b.text !== null && a.text !== b.text) entries.push({ kind: "value", path, detail: `ours="${a.text}" sample="${b.text}"` });
    const byName = (n: XmlNode[]) => {
      const m = new Map<string, XmlNode[]>();
      n.forEach((c) => m.set(c.name, [...(m.get(c.name) ?? []), c]));
      return m;
    };
    const am = byName(a.children);
    const bm = byName(b.children);
    const names = new Set([...am.keys(), ...bm.keys()]);
    // Order check: sequence of distinct child names
    const aSeq = Array.from(new Set(a.children.map((c) => c.name)));
    const bSeq = Array.from(new Set(b.children.map((c) => c.name)));
    const common = bSeq.filter((n) => aSeq.includes(n));
    const ourCommon = aSeq.filter((n) => bSeq.includes(n));
    if (common.join("|") !== ourCommon.join("|")) entries.push({ kind: "order", path, detail: `child order differs: ours=[${ourCommon.join(",")}] sample=[${common.join(",")}]` });
    for (const n of names) {
      const ac = am.get(n) ?? [];
      const bc = bm.get(n) ?? [];
      const len = Math.max(ac.length, bc.length);
      for (let i = 0; i < len; i++) walk(ac[i], bc[i], `${path}/${n}${len > 1 ? `[${i + 1}]` : ""}`);
    }
  };
  walk(ours, sample, ours.name);
  const critical = entries.filter((e) => e.kind !== "extra" && CRITICAL.test(e.path)).length;
  return { entries, critical, total: entries.length, compared };
}
