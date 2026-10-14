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

  console.log('Connected to MySQL. Updating credentials...');

  const hash = await bcrypt.hash('24CSE019', 10);

  // 1. Delete old checker emails
  await conn.query("DELETE FROM users WHERE email IN ('checker@apexloan.com', 'officer@apexloan.com')");
  console.log('Removed old checker accounts.');

  // 2. Update hemanthmanih@gmail.com to CHECKER role
  const [existing] = await conn.query("SELECT id FROM users WHERE email = 'hemanthmanih@gmail.com'");
  if (existing.length > 0) {
    await conn.query(
      "UPDATE users SET name = 'Hemanth (Checker)', role = 'CHECKER', password_hash = ? WHERE email = 'hemanthmanih@gmail.com'",
      [hash]
    );
    console.log('Updated hemanthmanih@gmail.com to CHECKER role with password 24CSE019');
  } else {
    await conn.query(
      "INSERT INTO users (name, email, phone, password_hash, role) VALUES ('Hemanth (Checker)', 'hemanthmanih@gmail.com', '9911223344', ?, 'CHECKER')",
      [hash]
    );
    console.log('Inserted hemanthmanih@gmail.com as CHECKER.');
  }

  const [users] = await conn.query('SELECT id, name, email, role FROM users');
  console.log('Current users:', JSON.stringify(users, null, 2));

  await conn.end();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
