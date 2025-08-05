import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Use individual MySQL environment variables to create connection
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: undefined,
  connectTimeout: 30000
};

console.log('MySQL config:', {
  host: mysqlConfig.host,
  port: mysqlConfig.port,
  user: mysqlConfig.user,
  database: mysqlConfig.database
});

if (!mysqlConfig.user || !mysqlConfig.password || !mysqlConfig.database) {
  throw new Error(
    "MySQL credentials must be set: MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE",
  );
}

// Create the MySQL connection pool
export const pool = mysql.createPool(mysqlConfig);
export const db = drizzle(pool, { schema, mode: 'default' });