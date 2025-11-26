const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const result = await pool.query('SELECT current_database(), version()');
    console.log('✅ Connected to database:', result.rows[0].current_database);
    console.log('📊 Database version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if it's Supabase
    if (process.env.DATABASE_URL.includes('supabase')) {
      console.log('✅ Using Supabase database');
    }
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\n📋 Tables in database:', tables.rows.map(r => r.table_name).join(', '));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

check();
