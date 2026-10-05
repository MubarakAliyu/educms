require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const { query, close, isTest, pgMem } = require("../config/database");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const statements = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) await query(statement);
  console.log("Database schema ready.");
}

if (require.main === module) {
  migrate().then(() => close()).catch(async (error) => { console.error(error); await close(); process.exit(1); });
}
module.exports = migrate;
