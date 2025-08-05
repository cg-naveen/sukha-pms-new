import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error(
    "MYSQL_DATABASE_URL must be set. Did you forget to configure MySQL?",
  );
}

// Create the MySQL connection pool
export const pool = mysql.createPool(process.env.MYSQL_DATABASE_URL);
export const db = drizzle(pool, { schema, mode: 'default' });