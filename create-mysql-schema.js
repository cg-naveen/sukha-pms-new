import mysql from 'mysql2/promise';

async function createSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✓ Connected to MySQL database');

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('superadmin', 'admin', 'staff', 'user') DEFAULT 'user',
        email VARCHAR(255),
        full_name VARCHAR(255),
        phone VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS residents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        ic_number VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        phone VARCHAR(255),
        date_of_birth DATE,
        emergency_contact VARCHAR(255),
        room_id INT,
        sales_referral ENUM('caGrand', 'Sales Team', 'Offline Event', 'Other') DEFAULT 'caGrand',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS next_of_kin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resident_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        relationship VARCHAR(255) NOT NULL,
        ic_number VARCHAR(255),
        phone VARCHAR(255),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_number VARCHAR(255) NOT NULL UNIQUE,
        floor_number INT NOT NULL,
        room_type ENUM('Standard', 'Deluxe', 'Suite', 'Presidential') DEFAULT 'Standard',
        status ENUM('vacant', 'occupied', 'maintenance', 'reserved') DEFAULT 'vacant',
        monthly_rent INT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS occupancy (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        resident_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS billings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resident_id INT NOT NULL,
        occupancy_id INT,
        amount INT NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
        description TEXT,
        invoice_file TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
        FOREIGN KEY (occupancy_id) REFERENCES occupancy(id) ON DELETE SET NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS visitors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resident_id INT,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        country_code ENUM('+60', '+65', '+1', '+44', '+86', '+91', '+81') DEFAULT '+60',
        purpose TEXT,
        visit_date DATE NOT NULL,
        visit_time VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected', 'visited') DEFAULT 'pending',
        approved_by_id INT,
        approved_at TIMESTAMP NULL,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resident_name VARCHAR(255),
        room_number VARCHAR(255),
        vehicle_number VARCHAR(255),
        number_of_visitors INT,
        details TEXT,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL,
        FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(255) NOT NULL,
        entity_id INT,
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
        expires INT(11) UNSIGNED NOT NULL,
        data MEDIUMTEXT COLLATE utf8mb4_bin,
        PRIMARY KEY (session_id)
      )`
    ];

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      try {
        await connection.execute(tables[i]);
        console.log(`✓ Created table: ${tableName}`);
      } catch (error) {
        console.log(`✗ Error creating table ${tableName}:`, error.message);
      }
    }

    // Show final table list
    const [tableList] = await connection.execute('SHOW TABLES');
    console.log('\nFinal tables in database:');
    tableList.forEach(table => console.log('- ', Object.values(table)[0]));

    await connection.end();
    console.log('\n✓ MySQL schema created successfully!');
  } catch (error) {
    console.error('✗ Schema creation failed:', error.message);
  }
}

createSchema();