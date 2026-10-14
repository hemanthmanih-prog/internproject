const { initDB, getPool } = require('../config/db');

async function migrate() {
  await initDB();
  const pool = getPool();
  if (!pool) {
    console.error('No pool connection');
    process.exit(1);
  }

  const columns = [
    { name: 'customer_id', type: 'VARCHAR(30) NULL' },
    { name: 'created_by_name', type: 'VARCHAR(120) NULL' },
    { name: 'created_by_email', type: 'VARCHAR(120) NULL' },
    { name: 'created_by_id', type: 'INT NULL' }
  ];

  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE loan_applications ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✅ Added column ${col.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`ℹ️ Column ${col.name} already exists`);
      } else {
        console.error(`Error adding ${col.name}:`, err.message);
      }
    }
  }

  // Update existing loans created_by if null
  try {
    await pool.query(`UPDATE loan_applications SET created_by_name = 'David Miller (Maker)', created_by_email = 'maker@apexloan.com' WHERE created_by_name IS NULL`);
    console.log('✅ Updated existing loans with default creator info');
  } catch (err) {
    console.error('Error updating existing loans:', err.message);
  }

  console.log('🎉 Migration finished successfully.');
  process.exit(0);
}

migrate();
