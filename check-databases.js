import mysql from 'mysql2/promise';

async function checkDatabases() {
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });

    console.log('✓ Connected to MySQL server successfully!');
    
    // Check available databases
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('\nAvailable databases:');
    databases.forEach(db => console.log('- ', db.Database));
    
    // Try to use our target database
    try {
      await connection.execute('USE trisquare_cg_pms');
      console.log('\n✓ Successfully accessed trisquare_cg_pms database');
      
      // Check tables in this database
      const [tables] = await connection.execute('SHOW TABLES');
      console.log('\nTables in trisquare_cg_pms:');
      tables.forEach(table => console.log('- ', Object.values(table)[0]));
      
    } catch (dbError) {
      console.log('\n✗ Cannot access trisquare_cg_pms:', dbError.message);
      
      // Try to create the database
      try {
        await connection.execute('CREATE DATABASE IF NOT EXISTS trisquare_cg_pms');
        console.log('✓ Created database trisquare_cg_pms');
      } catch (createError) {
        console.log('✗ Cannot create database:', createError.message);
      }
    }

    await connection.end();
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  }
}

checkDatabases();