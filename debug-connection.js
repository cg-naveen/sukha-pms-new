import mysql from 'mysql2/promise';

console.log('Connection details:');
console.log('Host:', process.env.MYSQL_HOST);
console.log('Port:', process.env.MYSQL_PORT);
console.log('User:', process.env.MYSQL_USER);
console.log('Database:', process.env.MYSQL_DATABASE);
console.log('Password length:', process.env.MYSQL_PASSWORD?.length);

// Try with different connection options
const configs = [
  {
    name: 'Standard connection',
    config: {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    }
  },
  {
    name: 'Connection without database',
    config: {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    }
  }
];

for (const test of configs) {
  try {
    console.log(`\nTesting ${test.name}...`);
    const connection = await mysql.createConnection(test.config);
    console.log(`✓ ${test.name} successful!`);
    await connection.end();
  } catch (error) {
    console.log(`✗ ${test.name} failed:`, error.code, error.message);
  }
}