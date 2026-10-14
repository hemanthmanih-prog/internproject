const { getPool, memoryDB } = require('../config/db');

// 1. Search Customers by ID, Name, Phone, or Email
exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const queryStr = (q || '').trim();
    const pool = getPool();

    if (pool) {
      let sql = 'SELECT * FROM customers';
      const params = [];

      if (queryStr) {
        sql += ' WHERE customer_id LIKE ? OR name LIKE ? OR phone LIKE ? OR email LIKE ?';
        const wildcard = `%${queryStr}%`;
        params.push(wildcard, wildcard, wildcard, wildcard);
      }

      sql += ' ORDER BY name ASC LIMIT 20';
      const [customers] = await pool.query(sql, params);

      return res.json({
        success: true,
        count: customers.length,
        data: customers
      });
    } else {
      const customers = memoryDB.searchCustomers(queryStr);
      return res.json({
        success: true,
        count: customers.length,
        data: customers
      });
    }
  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ success: false, message: 'Server error searching customers: ' + err.message });
  }
};

// 2. Get Single Customer Details by Customer ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    const trimmedId = id.trim();
    const pool = getPool();

    if (pool) {
      const [rows] = await pool.query(
        'SELECT * FROM customers WHERE customer_id = ? OR id = ? LIMIT 1',
        [trimmedId, isNaN(trimmedId) ? -1 : parseInt(trimmedId, 10)]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: `Customer "${trimmedId}" not found.` });
      }

      return res.json({
        success: true,
        data: rows[0]
      });
    } else {
      const cust = memoryDB.getCustomerById(trimmedId);
      if (!cust) {
        return res.status(404).json({ success: false, message: `Customer "${trimmedId}" not found.` });
      }

      return res.json({
        success: true,
        data: cust
      });
    }
  } catch (err) {
    console.error('Customer fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
