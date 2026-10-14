const bcrypt = require('bcryptjs');
const { getPool, memoryDB } = require('../config/db');
const { generateToken } = require('../middleware/authMiddleware');

// 1. Register New Account (Customer)
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRole = role === 'officer' ? 'officer' : 'customer';

    const pool = getPool();

    if (pool) {
      // Check existing in MySQL
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), cleanEmail, phone ? phone.trim() : null, passwordHash, userRole]
      );

      const user = {
        id: result.insertId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        role: userRole
      };

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully!',
        token,
        user
      });
    } else {
      // In-Memory store fallback
      const existing = memoryDB.findUserByEmail(cleanEmail);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = memoryDB.createUser({
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        password_hash: passwordHash,
        role: userRole
      });

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// 2. User Login
exports.login = async (req, res) => {
  try {
    const { email, password, workflow } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();

    // ─────────────────────────────────────────────────────────────
    // 1. STRICT CHECKER SECURITY:
    // Only hemanthmanih@gmail.com with password 24CSE019 can access the CHECKER desk.
    // Any other email or wrong password when accessing Checker is strictly rejected!
    // ─────────────────────────────────────────────────────────────
    if (workflow === 'CHECKER' || cleanEmail === 'hemanthmanih@gmail.com') {
      if (cleanEmail !== 'hemanthmanih@gmail.com' || password !== '24CSE019') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password. Authorized Checker credentials are required.'
        });
      }

      let checkerRecord = null;
      if (pool) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
        if (rows.length > 0) {
          checkerRecord = rows[0];
          if (checkerRecord.role !== 'CHECKER') {
            await pool.query('UPDATE users SET role = "CHECKER" WHERE id = ?', [checkerRecord.id]);
            checkerRecord.role = 'CHECKER';
          }
        } else {
          const passwordHash = await bcrypt.hash('24CSE019', 10);
          const [ins] = await pool.query(
            'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            ['Hemanth (Checker)', cleanEmail, '9876543210', passwordHash, 'CHECKER']
          );
          checkerRecord = {
            id: ins.insertId,
            name: 'Hemanth (Checker)',
            email: cleanEmail,
            phone: '9876543210',
            role: 'CHECKER'
          };
        }
      } else {
        checkerRecord = memoryDB.findUserByEmail(cleanEmail) || {
          id: 5,
          name: 'Hemanth (Checker)',
          email: cleanEmail,
          phone: '9876543210',
          role: 'CHECKER'
        };
      }

      const user = {
        id: checkerRecord.id,
        name: checkerRecord.name || 'Hemanth (Checker)',
        email: cleanEmail,
        phone: checkerRecord.phone || '9876543210',
        role: 'CHECKER'
      };

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Checker authenticated successfully!',
        token,
        user
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. MAKER LOGIN:
    // Any valid Gmail ID (@gmail.com) and password opens Maker page!
    // ─────────────────────────────────────────────────────────────
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@(?:gmail|googlemail)\.com$/i;
    if (!gmailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Gmail address (ending with @gmail.com) to access the Maker Desk.'
      });
    }

    let makerRecord = null;
    const displayName = cleanEmail.split('@')[0]
      .split(/[._-]/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ') || 'Maker';

    if (pool) {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) {
        makerRecord = rows[0];
        if (makerRecord.role !== 'MAKER') {
          await pool.query('UPDATE users SET role = "MAKER" WHERE id = ?', [makerRecord.id]);
          makerRecord.role = 'MAKER';
        }
      } else {
        const passwordHash = await bcrypt.hash(password, 10);
        const [ins] = await pool.query(
          'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
          [displayName + ' (Maker)', cleanEmail, null, passwordHash, 'MAKER']
        );
        makerRecord = {
          id: ins.insertId,
          name: displayName + ' (Maker)',
          email: cleanEmail,
          phone: null,
          role: 'MAKER'
        };
      }
    } else {
      makerRecord = memoryDB.findUserByEmail(cleanEmail);
      if (!makerRecord) {
        const passwordHash = await bcrypt.hash(password, 10);
        makerRecord = memoryDB.createUser({
          name: displayName + ' (Maker)',
          email: cleanEmail,
          password_hash: passwordHash,
          role: 'MAKER'
        });
      }
    }

    const user = {
      id: makerRecord.id,
      name: makerRecord.name || displayName + ' (Maker)',
      email: makerRecord.email || cleanEmail,
      phone: makerRecord.phone || null,
      role: 'MAKER'
    };

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Maker authenticated successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// 3. Get Current User Profile (from token)
exports.getMe = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

// 4. Get My Submitted Loans
exports.getMyLoans = async (req, res) => {
  try {
    const user = req.user;
    const pool = getPool();

    if (pool) {
      const [loans] = await pool.query(
        `SELECT * FROM loan_applications 
         WHERE email = ? OR phone = ? OR created_by_email = ? OR created_by_id = ?
         ORDER BY created_at DESC`,
        [user.email, user.phone || '', user.email, user.id || 0]
      );
      res.json({ success: true, data: loans });
    } else {
      const loans = memoryDB.getAll('ALL', 'ALL', '').filter(
        l => l.email.toLowerCase() === user.email.toLowerCase() || 
             (user.phone && l.phone === user.phone) ||
             (l.created_by_email && l.created_by_email.toLowerCase() === user.email.toLowerCase()) ||
             (l.created_by_id && l.created_by_id === user.id)
      );
      res.json({ success: true, data: loans });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
