import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { getFile } from "@/lib/storage";
import { currentUser } from "@/lib/org";

/** Download an export file. Already-exported files are always accessible to org members (brief phase 3 §5). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const row = await db.query.exportsTable.findFirst({ where: eq(schema.exportsTable.id, id) });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, row.organizationId), eq(schema.memberships.userId, user.id)) });
  if (!m && !user.isSuperadmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const buf = await getFile(row.blobUrl);
  const mime = row.kind === "sad_xml" ? "application/xml" : row.kind === "xls" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/json";
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": mime, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`, "cache-control": "private, no-store" } });
}
