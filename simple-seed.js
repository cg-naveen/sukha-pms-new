import mysql from 'mysql2/promise';

async function simpleSeed() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✓ Connected to MySQL database');

    // Create sample rooms
    const rooms = [
      { unit_number: '101A', floor: 1, room_type: 'Standard', status: 'vacant', monthly_rate: 800 },
      { unit_number: '102A', floor: 1, room_type: 'Standard', status: 'occupied', monthly_rate: 800 },
      { unit_number: '201B', floor: 2, room_type: 'Deluxe', status: 'vacant', monthly_rate: 1200 },
      { unit_number: '202B', floor: 2, room_type: 'Suite', status: 'occupied', monthly_rate: 1500 }
    ];

    // Check if rooms exist
    const [existingRooms] = await connection.execute('SELECT COUNT(*) as count FROM rooms');
    if (existingRooms[0].count === 0) {
      console.log('Creating sample rooms...');
      for (const room of rooms) {
        await connection.execute(
          'INSERT INTO rooms (unit_number, floor, room_type, status, monthly_rate, description) VALUES (?, ?, ?, ?, ?, ?)',
          [room.unit_number, room.floor, room.room_type, room.status, room.monthly_rate, `${room.room_type} apartment`]
        );
      }
      console.log('✓ Sample rooms created');
    }

    // Create sample residents
    const [existingResidents] = await connection.execute('SELECT COUNT(*) as count FROM residents');
    if (existingResidents[0].count === 0) {
      console.log('Creating sample residents...');
      const residents = [
        { full_name: 'John Smith', id_number: 'IC123456', email: 'john@example.com', phone: '012-345-6789', sales_referral: 'caGrand' },
        { full_name: 'Mary Johnson', id_number: 'IC789012', email: 'mary@example.com', phone: '012-987-6543', sales_referral: 'Sales Team' }
      ];

      for (const resident of residents) {
        await connection.execute(
          'INSERT INTO residents (full_name, id_number, email, phone, sales_referral) VALUES (?, ?, ?, ?, ?)',
          [resident.full_name, resident.id_number, resident.email, resident.phone, resident.sales_referral]
        );
      }
      console.log('✓ Sample residents created');
    }

    console.log('\n✓ Database seeded successfully!');
    await connection.end();
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
  }
}

simpleSeed();