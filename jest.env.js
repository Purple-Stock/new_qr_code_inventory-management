import path from "path";

const testDbPath = path.resolve(process.cwd(), "src/db.test.sqlite");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${testDbPath}`;
}
