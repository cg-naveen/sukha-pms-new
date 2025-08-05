import mysql from 'mysql2/promise';

async function fixSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✓ Connected to MySQL database');

    // Add missing columns to match Drizzle schema
    const alterCommands = [
      // Fix rooms table
      `ALTER TABLE rooms 
       ADD COLUMN IF NOT EXISTS size INT NOT NULL DEFAULT 300 AFTER room_type`,
      `ALTER TABLE rooms 
       CHANGE COLUMN floor_number \`floor\` INT NOT NULL`,
      `ALTER TABLE rooms 
       CHANGE COLUMN monthly_rent monthly_rate INT NOT NULL`,
      `ALTER TABLE rooms 
       ADD COLUMN IF NOT EXISTS room_status ENUM('vacant', 'occupied', 'maintenance', 'reserved') DEFAULT 'vacant' AFTER status`,
      `ALTER TABLE rooms DROP COLUMN IF EXISTS status`,
      `ALTER TABLE rooms CHANGE COLUMN room_status status ENUM('vacant', 'occupied', 'maintenance', 'reserved') DEFAULT 'vacant'`,

      // Fix residents table
      `ALTER TABLE residents 
       CHANGE COLUMN ic_number id_number VARCHAR(255) UNIQUE`,
      `ALTER TABLE residents 
       ADD COLUMN IF NOT EXISTS country_code ENUM('+60', '+65', '+1', '+44', '+86', '+91', '+81') DEFAULT '+60' AFTER phone`,
      `ALTER TABLE residents 
       ADD COLUMN IF NOT EXISTS address TEXT AFTER date_of_birth`,
      `ALTER TABLE residents 
       ADD COLUMN IF NOT EXISTS photo TEXT AFTER address`,

      // Fix occupancy table
      `ALTER TABLE occupancy 
       CHANGE COLUMN end_date end_date DATE NULL`
    ];

    for (const command of alterCommands) {
      try {
        await connection.execute(command);
        console.log('✓ Executed:', command.substring(0, 50) + '...');
      } catch (error) {
        if (!error.message.includes('Duplicate column')) {
          console.log('⚠️ Error (might be expected):', error.message.substring(0, 100));
        }
      }
    }

    // Check final schema
    const [columns] = await connection.execute('DESCRIBE rooms');
    console.log('\nRooms table structure:');
    columns.forEach(col => console.log('- ', col.Field, ':', col.Type));

    await connection.end();
    console.log('\n✓ Schema fix completed!');
  } catch (error) {
    console.error('✗ Schema fix failed:', error.message);
  }
}

fixSchema();