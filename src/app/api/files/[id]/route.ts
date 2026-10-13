import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { getFile, verifyDownload } from "@/lib/storage";
import { currentUser } from "@/lib/org";

/** Private file download: requires a signed short-lived token OR an authenticated member of the org. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const db = await getDb();
  const doc = await db.query.documents.findFirst({ where: eq(schema.documents.id, id) });
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  let allowed = false;
  if (token) {
    const v = await verifyDownload(token);
    allowed = !!v && v.documentId === doc.id && v.orgId === doc.organizationId;
  }
  if (!allowed) {
    const user = await currentUser();
    if (user) {
      const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, doc.organizationId), eq(schema.memberships.userId, user.id)) });
      allowed = !!m || user.isSuperadmin;
    }
  }
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const buf = await getFile(doc.blobUrl);
  const inline = url.searchParams.get("dl") !== "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": doc.mime,
      "content-length": String(buf.length),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "cache-control": "private, no-store",
    },
  });
}
