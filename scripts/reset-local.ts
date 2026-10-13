/** Delete local PGlite data + local blobs (dev only). */
import { promises as fs } from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.error("DATABASE_URL is set — refusing to reset a remote database.");
  process.exit(1);
}
await fs.rm(path.join(process.cwd(), ".data"), { recursive: true, force: true });
console.log(".data removed");
