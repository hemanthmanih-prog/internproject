require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loan_db'
  });

  console.log('Connected to MySQL. Updating Maker credentials...');

  // 1. Delete old maker@apexloan.com
  await conn.query("DELETE FROM users WHERE email = 'maker@apexloan.com'");

  // 2. Hash 24CSE019
  const hash = await bcrypt.hash('24CSE019', 10);

  // 3. Upsert hemanthmanih@gmail.com
  const [existing] = await conn.query("SELECT id FROM users WHERE email = 'hemanthmanih@gmail.com'");
  if (existing.length > 0) {
    await conn.query(
      "UPDATE users SET name = 'Hemanth (Maker)', password_hash = ?, role = 'MAKER' WHERE email = 'hemanthmanih@gmail.com'",
      [hash]
    );
    console.log('Updated hemanthmanih@gmail.com in users table.');
  } else {
    await conn.query(
      "INSERT INTO users (name, email, phone, password_hash, role) VALUES ('Hemanth (Maker)', 'hemanthmanih@gmail.com', '9911223344', ?, 'MAKER')",
      [hash]
    );
    console.log('Inserted hemanthmanih@gmail.com into users table.');
  }

  // 4. Update loan_applications to attribute maker to hemanthmanih@gmail.com
  await conn.query(
    "UPDATE loan_applications SET created_by_email = 'hemanthmanih@gmail.com', created_by_name = 'Hemanth (Maker)' WHERE created_by_email = 'maker@apexloan.com' OR created_by_email IS NULL"
  );
  console.log('Updated loan_applications attribution.');

  const [users] = await conn.query('SELECT id, name, email, role FROM users');
  console.log('Current users:', JSON.stringify(users, null, 2));

  await conn.end();
}

run().catch(err => {
  console.error('Error updating maker:', err);
  process.exit(1);
});
