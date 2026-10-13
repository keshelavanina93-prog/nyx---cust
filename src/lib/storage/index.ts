/**
 * Private file storage. Selected by env:
 * - STORAGE=gcs (or GCS_BUCKET set)    → Google Cloud Storage, private bucket, ADC / service account.
 * - BLOB_READ_WRITE_TOKEN set          → Vercel Blob (private access).
 * - otherwise                          → local disk under ./.data/blobs (development only).
 * Files are served through /api/files/[id] with a short-lived signed URL (≤10 min) [brief §9].
 */
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "text/xml", "application/xml"]);

const localRoot = path.join(process.cwd(), ".data", "blobs");

export type StoredFile = { key: string; url: string; sha256: string; size: number };

export function sha256(buf: Buffer | Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function storageBackend(): "gcs" | "vercel-blob" | "local" {
  if (process.env.STORAGE === "gcs" || process.env.GCS_BUCKET) return "gcs";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

async function gcsBucket() {
  const { Storage } = await import("@google-cloud/storage");
  const name = process.env.GCS_BUCKET;
  if (!name) throw new Error("GCS_BUCKET not set");
  return new Storage().bucket(name);
}

export async function putFile(orgId: string, fileName: string, data: Buffer, contentType: string): Promise<StoredFile> {
  const key = `${orgId}/${randomUUID()}-${fileName.replace(/[^\w.\-]+/g, "_")}`;
  const digest = sha256(data);
  const backend = storageBackend();
  if (backend === "gcs") {
    const bucket = await gcsBucket();
    await bucket.file(key).save(data, { contentType, resumable: false, metadata: { cacheControl: "private, no-store" } });
    return { key, url: `gs://${bucket.name}/${key}`, sha256: digest, size: data.length };
  }
  if (backend === "vercel-blob") {
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, { access: "private", contentType, addRandomSuffix: false } as Parameters<typeof put>[2]);
    return { key, url: res.url, sha256: digest, size: data.length };
  }
  const full = path.join(localRoot, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return { key, url: `local://${key}`, sha256: digest, size: data.length };
}

export async function getFile(url: string): Promise<Buffer> {
  if (url.startsWith("local://")) {
    return fs.readFile(path.join(localRoot, url.slice("local://".length)));
  }
  if (url.startsWith("gs://")) {
    const m = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!m) throw new Error("bad gs url");
    const { Storage } = await import("@google-cloud/storage");
    const [buf] = await new Storage().bucket(m[1]!).file(m[2]!).download();
    return buf;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { get } = await import("@vercel/blob");
    const res = await get(url, { access: "private" } as Parameters<typeof get>[1]);
    if (!res || !("stream" in res) || !res.stream) throw new Error("blob not found");
    const ab = await new Response(res.stream as ReadableStream).arrayBuffer();
    return Buffer.from(ab);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");
}

/** Signed, short-lived (10 min) download token for /api/files/[documentId]. */
export async function signDownload(documentId: string, orgId: string): Promise<string> {
  return new SignJWT({ d: documentId, o: orgId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(secret());
}

export async function verifyDownload(token: string): Promise<{ documentId: string; orgId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { documentId: String(payload.d), orgId: String(payload.o) };
  } catch {
    return null;
  }
}
