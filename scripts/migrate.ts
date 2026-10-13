import "dotenv/config";
import { getDb, dbMode } from "../src/db/client";

await getDb();
console.log(`migrations applied (${dbMode()})`);
process.exit(0);
