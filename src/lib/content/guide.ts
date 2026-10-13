/**
 * Guide content (Georgian) lives in docs/guide-content/*.md so it can be edited without code.
 * Checklist templates are [ASSUMPTION] content (brief §5.8) and live in docs/guide-content/checklists.json.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ChecklistItem } from "@/db/schema";

const root = path.join(process.cwd(), "docs", "guide-content");

export type GuideBlock = { type: "h2" | "h3" | "p" | "ul" | "ol" | "note" | "screenshot"; text?: string; items?: string[] };

const cache = new Map<string, GuideBlock[]>();

export async function loadGuide(slug: string): Promise<GuideBlock[]> {
  if (process.env.NODE_ENV === "production" && cache.has(slug)) return cache.get(slug)!;
  let md = "";
  try {
    md = await fs.readFile(path.join(root, `${slug}.md`), "utf8");
  } catch {
    return [{ type: "note", text: `guide "${slug}" not found` }];
  }
  const blocks = parseMarkdown(md);
  cache.set(slug, blocks);
  return blocks;
}

/** Minimal markdown: ## / ### headings, -, 1. lists, > notes, ![screenshot](...) placeholders, paragraphs. */
export function parseMarkdown(md: string): GuideBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: GuideBlock[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (para.length) {
      out.push({ type: "p", text: para.join(" ") });
      para = [];
    }
    if (list) {
      out.push({ type: list.type, items: list.items });
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.startsWith("# ")) {
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      out.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("### ")) {
      flush();
      out.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("> ")) {
      flush();
      out.push({ type: "note", text: line.slice(2) });
    } else if (/^!\[/.test(line)) {
      flush();
      out.push({ type: "screenshot", text: line.replace(/^!\[(.*?)\].*$/, "$1") });
    } else if (/^[-*] /.test(line)) {
      if (para.length) flush();
      if (!list || list.type !== "ul") {
        if (list) flush();
        list = { type: "ul", items: [] };
      }
      list.items.push(line.slice(2));
    } else if (/^\d+\. /.test(line)) {
      if (para.length) flush();
      if (!list || list.type !== "ol") {
        if (list) flush();
        list = { type: "ol", items: [] };
      }
      list.items.push(line.replace(/^\d+\. /, ""));
    } else {
      if (list) flush();
      para.push(line);
    }
  }
  flush();
  return out;
}

export type ChecklistTemplates = Record<string, { label_ka: string; required: boolean; hint_ka?: string; key: string }[]>;

export async function loadChecklistTemplate(kind: string): Promise<ChecklistItem[]> {
  const txt = await fs.readFile(path.join(root, "checklists.json"), "utf8");
  const all = JSON.parse(txt) as ChecklistTemplates;
  return (all[kind] ?? []).map((i) => ({ key: i.key, label_ka: i.label_ka, required: i.required, done: false, doc_id: null, hint_ka: i.hint_ka }));
}
