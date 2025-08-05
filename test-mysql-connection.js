// Quick test script to verify MySQL connection
import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✓ Successfully connected to MySQL!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✓ Query test successful:', rows);

    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✓ Existing tables:', tables);

    await connection.end();
  } catch (error) {
    console.error('✗ MySQL connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();