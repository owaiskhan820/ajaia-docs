import { neon } from "@neondatabase/serverless";

// Single connection pool reused across requests in the same lambda instance
const sql = neon(process.env.DATABASE_URL!);

export default sql;
