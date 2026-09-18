import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "database.db"));

const result = db.prepare(
  "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE is_verified = 0"
).run();

console.log(`✅ ${result.changes} compte(s) vérifié(s) manuellement`);