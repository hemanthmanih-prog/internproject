const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'loan_db';

let pool = null;
let isConnected = false;
let lastError = null;

// Pre-hashed passwords for accounts
const defaultCheckerHash = bcrypt.hashSync('24CSE019', 10);
const defaultCustomerHash = bcrypt.hashSync('Customer@123', 10);

let memoryUsers = [
  {
    id: 5,
    name: 'Hemanth (Checker)',
    email: 'hemanthmanih@gmail.com',
    phone: '9911223344',
    password_hash: defaultCheckerHash,
    role: 'CHECKER',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 4,
    name: 'Aarav Sharma',
    email: 'customer@apexloan.com',
    phone: '9876543210',
    password_hash: defaultCustomerHash,
    role: 'CUSTOMER',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  }
];

// Existing Customers Master Dataset
let memoryCustomers = [
  {
    customer_id: 'CUST-1001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    dob: '1992-05-14',
    gender: 'Male',
    pan_id: 'ABCDE1234F',
    address: '42 Orchid Park, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    employment_type: 'Salaried',
    employer_name: 'Infosys Tech Ltd',
    monthly_income: 85000,
    existing_emis: 12000,
    credit_score: 780,
    account_number: 'AC-55928104'
  },
  {
    customer_id: 'CUST-1002',
    name: 'Priya Verma',
    email: 'priya.verma@example.com',
    phone: '9812345678',
    dob: '1996-08-22',
    gender: 'Female',
    pan_id: 'PQRST5678G',
    address: 'B-12 Sunrise Towers, Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400076',
    employment_type: 'Salaried',
    employer_name: 'Tata Consultancy Services',
    monthly_income: 62000,
    existing_emis: 0,
    credit_score: 755,
    account_number: 'AC-99482173'
  },
  {
    customer_id: 'CUST-1003',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@example.com',
    phone: '9765432109',
    dob: '1989-11-03',
    gender: 'Male',
    pan_id: 'UVWXY9012H',
    address: '15 Nehru Nagar, Ring Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    employment_type: 'Self-Employed',
    employer_name: 'Mehta Textile Trading Co.',
    monthly_income: 140000,
    existing_emis: 25000,
    credit_score: 790,
    account_number: 'AC-33019842'
  },
  {
    customer_id: 'CUST-1004',
    name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@example.com',
    phone: '9845012345',
    dob: '1995-02-18',
    gender: 'Female',
    pan_id: 'KLMNO3456J',
    address: '704 Lotus Court, Baner',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    employment_type: 'Salaried',
    employer_name: 'Wipro Technologies',
    monthly_income: 98000,
    existing_emis: 8000,
    credit_score: 810,
    account_number: 'AC-77123490'
  },
  {
    customer_id: 'CUST-1005',
    name: 'Rajesh Patel',
    email: 'rajesh.patel@example.com',
    phone: '9920198765',
    dob: '1984-07-29',
    gender: 'Male',
    pan_id: 'FGHIJ7890K',
    address: '88 Diamond Arcade, Varachha',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395006',
    employment_type: 'Business Owner',
    employer_name: 'Patel Gems & Export',
    monthly_income: 220000,
    existing_emis: 45000,
    credit_score: 765,
    account_number: 'AC-11928475'
  }
];

// Fallback in-memory store initialized with sample data
let memoryLoans = [
  {
    id: 1,
    application_number: 'LN-2026-7841',
    customer_id: 'CUST-1001',
    applicant_name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    dob: '1992-05-14',
    gender: 'Male',
    pan_or_id: 'ABCDE1234F',
    address: '42 Orchid Park, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    employment_type: 'Salaried',
    employer_name: 'Infosys Tech',
    monthly_income: 85000,
    existing_emis: 12000,
    credit_score: 780,
    loan_type: 'Home Loan',
    loan_amount: 3500000,
    tenure_months: 180,
    interest_rate: 8.40,
    monthly_emi: 34289.45,
    loan_purpose: 'Purchasing 2BHK residential flat in Whitefield',
    status: 'PENDING_APPROVAL',
    officer_notes: 'Initial appraisal complete. Loan proposal submitted for Checker verification.',
    created_by_name: 'David Miller (Maker)',
    created_by_email: 'maker@apexloan.com',
    created_by_id: 1,
    created_at: new Date('2026-10-10T14:30:00Z').toISOString(),
    updated_at: new Date('2026-10-10T15:00:00Z').toISOString(),
  },
  {
    id: 2,
    application_number: 'LN-2026-9124',
    customer_id: 'CUST-1002',
    applicant_name: 'Priya Verma',
    email: 'priya.verma@example.com',
    phone: '9812345678',
    dob: '1996-08-22',
    gender: 'Female',
    pan_or_id: 'PQRST5678G',
    address: 'B-12 Sunrise Towers, Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400076',
    employment_type: 'Salaried',
    employer_name: 'Tata Consultancy Services',
    monthly_income: 62000,
    existing_emis: 0,
    credit_score: 755,
    loan_type: 'Personal Loan',
    loan_amount: 400000,
    tenure_months: 36,
    interest_rate: 11.25,
    monthly_emi: 13146.12,
    loan_purpose: 'Medical emergency and family vacation',
    status: 'APPROVED',
    officer_notes: 'Documentation complete and salary slip verified. Approved with standard terms.',
    created_by_name: 'David Miller (Maker)',
    created_by_email: 'maker@apexloan.com',
    created_by_id: 1,
    created_at: new Date('2026-10-09T11:15:00Z').toISOString(),
    updated_at: new Date('2026-10-09T16:20:00Z').toISOString(),
  },
  {
    id: 3,
    application_number: 'LN-2026-5503',
    customer_id: 'CUST-1003',
    applicant_name: 'Vikram Mehta',
    email: 'vikram.mehta@example.com',
    phone: '9765432109',
    dob: '1989-11-03',
    gender: 'Male',
    pan_or_id: 'UVWXY9012H',
    address: '15 Nehru Nagar, Ring Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    employment_type: 'Self-Employed',
    employer_name: 'Mehta Textile Trading Co.',
    monthly_income: 140000,
    existing_emis: 25000,
    credit_score: 790,
    loan_type: 'Auto Loan',
    loan_amount: 1200000,
    tenure_months: 60,
    interest_rate: 9.10,
    monthly_emi: 24987.30,
    loan_purpose: 'Purchase of Hyundai Creta SX(O)',
    status: 'DISBURSED',
    officer_notes: 'Down payment paid. Loan disbursed to dealer directly.',
    created_by_name: 'David Miller (Maker)',
    created_by_email: 'maker@apexloan.com',
    created_by_id: 1,
    created_at: new Date('2026-10-08T09:45:00Z').toISOString(),
    updated_at: new Date('2026-10-08T17:10:00Z').toISOString(),
  },
  {
    id: 4,
    application_number: 'LN-2026-3829',
    customer_id: 'CUST-1004',
    applicant_name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@example.com',
    phone: '9845012345',
    dob: '1995-02-18',
    gender: 'Female',
    pan_or_id: 'KLMNO3456J',
    address: '704 Lotus Court, Baner',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    employment_type: 'Salaried',
    employer_name: 'Wipro Technologies',
    monthly_income: 98000,
    existing_emis: 8000,
    credit_score: 810,
    loan_type: 'Business Loan',
    loan_amount: 1500000,
    tenure_months: 48,
    interest_rate: 12.50,
    monthly_emi: 39900.00,
    loan_purpose: 'Expansion capital for artisanal retail boutique',
    status: 'PENDING_APPROVAL',
    officer_notes: 'Maker appraisal complete. Awaiting Checker final authorization.',
    created_by_name: 'David Miller (Maker)',
    created_by_email: 'maker@apexloan.com',
    created_by_id: 1,
    created_at: new Date('2026-10-11T09:15:00Z').toISOString(),
    updated_at: new Date('2026-10-11T09:15:00Z').toISOString(),
  },
  {
    id: 5,
    application_number: 'LN-2026-1920',
    customer_id: 'CUST-1005',
    applicant_name: 'Rajesh Patel',
    email: 'rajesh.patel@example.com',
    phone: '9823456789',
    dob: '1985-07-29',
    gender: 'Male',
    pan_or_id: 'GHJKL7890K',
    address: '88 Diamond Market, Varachha',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395006',
    employment_type: 'Business Owner',
    employer_name: 'Patel Gems & Export',
    monthly_income: 220000,
    existing_emis: 45000,
    credit_score: 610,
    loan_type: 'Personal Loan',
    loan_amount: 800000,
    tenure_months: 24,
    interest_rate: 14.00,
    monthly_emi: 38400.00,
    loan_purpose: 'Short-term bridge financing for seasonal trade',
    status: 'REJECTED',
    officer_notes: 'Credit score below threshold (610 < 650) with high existing leverage ratio.',
    created_by_name: 'David Miller (Maker)',
    created_by_email: 'maker@apexloan.com',
    created_by_id: 1,
    created_at: new Date('2026-10-07T11:00:00Z').toISOString(),
    updated_at: new Date('2026-10-07T14:30:00Z').toISOString(),
  }
];

let memoryHistory = [
  { id: 1, application_id: 1, status: 'SUBMITTED', comment: 'Application submitted online.', changed_by: 'System', created_at: new Date('2026-10-10T14:30:00Z').toISOString() },
  { id: 2, application_id: 1, status: 'UNDER_REVIEW', comment: 'Initial credit check passed. Awaiting property title deed verification.', changed_by: 'Loan Underwriter', created_at: new Date('2026-10-10T15:00:00Z').toISOString() },
  { id: 3, application_id: 2, status: 'SUBMITTED', comment: 'Application submitted online.', changed_by: 'System', created_at: new Date('2026-10-09T11:15:00Z').toISOString() },
  { id: 4, application_id: 2, status: 'APPROVED', comment: 'Documentation complete and salary slip verified.', changed_by: 'Credit Officer', created_at: new Date('2026-10-09T16:20:00Z').toISOString() },
  { id: 5, application_id: 3, status: 'SUBMITTED', comment: 'Application submitted online.', changed_by: 'System', created_at: new Date('2026-10-08T09:45:00Z').toISOString() },
  { id: 6, application_id: 3, status: 'APPROVED', comment: 'Credit assessment successful.', changed_by: 'Credit Officer', created_at: new Date('2026-10-08T14:30:00Z').toISOString() },
  { id: 7, application_id: 3, status: 'DISBURSED', comment: 'Down payment paid. Loan disbursed to dealer directly.', changed_by: 'Accounts Dept', created_at: new Date('2026-10-08T17:10:00Z').toISOString() }
];

async function initDB() {
  try {
    const tempConnection = await mysql.createConnection(dbConfig);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    const testConn = await pool.getConnection();
    testConn.release();

    await createTables();
    await seedDemoData();

    isConnected = true;
    lastError = null;
    console.log(`[MySQL] Successfully connected to database: ${dbName}`);
    return true;
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    console.warn(`[MySQL] Note: Could not connect to MySQL (${err.message}). Seamlessly running in active demo mode until DB_PASSWORD is provided in .env.`);
    return false;
  }
}

async function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(120) UNIQUE NOT NULL,
      phone VARCHAR(30) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'CUSTOMER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_email (email)
    ) ENGINE=InnoDB;
  `;

  const createLoansTable = `
    CREATE TABLE IF NOT EXISTS loan_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_number VARCHAR(30) UNIQUE NOT NULL,
      applicant_name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      dob DATE NULL,
      gender VARCHAR(20) NULL,
      pan_or_id VARCHAR(50) NULL,
      address TEXT NULL,
      city VARCHAR(60) NULL,
      state VARCHAR(60) NULL,
      pincode VARCHAR(20) NULL,
      employment_type VARCHAR(50) NOT NULL,
      employer_name VARCHAR(120) NULL,
      monthly_income DECIMAL(12, 2) NOT NULL,
      existing_emis DECIMAL(12, 2) DEFAULT 0,
      credit_score INT DEFAULT 740,
      loan_type VARCHAR(50) NOT NULL,
      loan_amount DECIMAL(12, 2) NOT NULL,
      tenure_months INT NOT NULL,
      interest_rate DECIMAL(5, 2) NOT NULL,
      monthly_emi DECIMAL(12, 2) NOT NULL,
      loan_purpose TEXT NULL,
      status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
      officer_notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_app_num (application_number),
      INDEX idx_email_phone (email, phone),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;
  `;

  const createStatusHistoryTable = `
    CREATE TABLE IF NOT EXISTS loan_status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      comment TEXT NULL,
      changed_by VARCHAR(60) DEFAULT 'System',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
      INDEX idx_app_id (application_id)
    ) ENGINE=InnoDB;
  `;

  const createCustomersTable = `
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id VARCHAR(30) UNIQUE NOT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      dob DATE NULL,
      gender VARCHAR(20) NULL,
      pan_id VARCHAR(50) NULL,
      address TEXT NULL,
      city VARCHAR(60) NULL,
      state VARCHAR(60) NULL,
      pincode VARCHAR(20) NULL,
      employment_type VARCHAR(50) NOT NULL,
      employer_name VARCHAR(120) NULL,
      monthly_income DECIMAL(12, 2) NOT NULL,
      existing_emis DECIMAL(12, 2) DEFAULT 0,
      credit_score INT DEFAULT 750,
      account_number VARCHAR(30) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cust_id (customer_id),
      INDEX idx_cust_name (name)
    ) ENGINE=InnoDB;
  `;

  await pool.query(createUsersTable);
  await pool.query(createCustomersTable);
  await pool.query(createLoansTable);
  await pool.query(createStatusHistoryTable);
}

async function seedDemoData() {
  // Seed Existing Customers
  const [custRows] = await pool.query('SELECT COUNT(*) as count FROM customers');
  if (custRows[0].count === 0) {
    console.log('[MySQL] Seeding master customer database...');
    for (const c of memoryCustomers) {
      await pool.query(
        `INSERT INTO customers 
        (customer_id, name, email, phone, dob, gender, pan_id, address, city, state, pincode, employment_type, employer_name, monthly_income, existing_emis, credit_score, account_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.customer_id, c.name, c.email, c.phone, c.dob, c.gender, c.pan_id, c.address, c.city, c.state, c.pincode,
          c.employment_type, c.employer_name, c.monthly_income, c.existing_emis, c.credit_score, c.account_number
        ]
      );
    }
  }

  // Seed Users
  const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (userRows[0].count === 0) {
    console.log('[MySQL] Seeding default JWT auth accounts...');
    for (const u of memoryUsers) {
      await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [u.name, u.email, u.phone, u.password_hash, u.role]
      );
    }
  }

  // Seed Loans
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM loan_applications');
  if (rows[0].count === 0) {
    for (const s of memoryLoans) {
      const [res] = await pool.query(
        `INSERT INTO loan_applications 
        (application_number, applicant_name, email, phone, dob, gender, pan_or_id, address, city, state, pincode, employment_type, employer_name, monthly_income, existing_emis, credit_score, loan_type, loan_amount, tenure_months, interest_rate, monthly_emi, loan_purpose, status, officer_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.application_number, s.applicant_name, s.email, s.phone, s.dob, s.gender, s.pan_or_id, s.address, s.city, s.state, s.pincode,
          s.employment_type, s.employer_name, s.monthly_income, s.existing_emis, s.credit_score, s.loan_type, s.loan_amount, s.tenure_months, s.interest_rate, s.monthly_emi, s.loan_purpose, s.status, s.officer_notes
        ]
      );

      await pool.query(
        `INSERT INTO loan_status_history (application_id, status, comment, changed_by) VALUES (?, 'SUBMITTED', 'Application submitted by applicant online.', 'System')`,
        [res.insertId]
      );

      if (s.status !== 'SUBMITTED') {
        await pool.query(
          `INSERT INTO loan_status_history (application_id, status, comment, changed_by) VALUES (?, ?, ?, ?)`,
          [res.insertId, s.status, s.officer_notes || 'Status updated by officer.', 'Loan Officer']
        );
      }
    }
  }
}

// In-Memory operations fallback helpers
const memoryDB = {
  // User Authentication Methods
  findUserByEmail(email) {
    if (!email) return null;
    return memoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },

  findUserById(id) {
    return memoryUsers.find(u => u.id === parseInt(id, 10));
  },

  createUser(data) {
    const newId = memoryUsers.length > 0 ? Math.max(...memoryUsers.map(u => u.id)) + 1 : 1;
    const user = {
      id: newId,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || null,
      password_hash: data.password_hash,
      role: data.role || 'customer',
      created_at: new Date().toISOString()
    };
    memoryUsers.push(user);
    return user;
  },

  // Customer Management Methods
  searchCustomers(query) {
    if (!query || !query.trim()) return memoryCustomers;
    const q = query.toLowerCase().trim();
    return memoryCustomers.filter(c => 
      c.customer_id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  },

  getCustomerById(custId) {
    const q = (custId || '').toLowerCase().trim();
    return memoryCustomers.find(c => c.customer_id.toLowerCase() === q);
  },

  // Application methods
  createApplication(data) {
    const newId = memoryLoans.length > 0 ? Math.max(...memoryLoans.map(l => l.id)) + 1 : 1;
    const loanStatus = data.status || 'PENDING_APPROVAL';
    const record = {
      id: newId,
      ...data,
      status: loanStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryLoans.unshift(record);

    memoryHistory.push({
      id: memoryHistory.length + 1,
      application_id: newId,
      status: loanStatus,
      comment: data.officer_notes || data.remarks || 'Loan created by Maker and submitted for approval.',
      changed_by: data.submitted_by || 'Maker',
      created_at: new Date().toISOString()
    });

    return record;
  },

  findApplication(query) {
    const q = (query || '').toLowerCase().trim();
    return memoryLoans.filter(l => 
      (l.application_number && l.application_number.toLowerCase() === q) ||
      (l.phone && l.phone.toLowerCase() === q) ||
      (l.email && l.email.toLowerCase() === q) ||
      (l.customer_id && l.customer_id.toLowerCase() === q) ||
      (l.created_by_email && l.created_by_email.toLowerCase() === q) ||
      (l.created_by_id && String(l.created_by_id) === q) ||
      (l.created_by_name && l.created_by_name.toLowerCase().includes(q))
    );
  },

  getLoansByMaker(makerIdentifier) {
    const q = String(makerIdentifier || '').toLowerCase().trim();
    return memoryLoans.filter(l => 
      (l.created_by_email && l.created_by_email.toLowerCase() === q) ||
      (l.created_by_id && String(l.created_by_id) === q) ||
      (l.created_by_name && l.created_by_name.toLowerCase().includes(q))
    );
  },

  getHistory(appId) {
    return memoryHistory.filter(h => h.application_id === appId);
  },

  getAll(status, loanType, search) {
    let filtered = [...memoryLoans];
    if (status && status !== 'ALL') {
      filtered = filtered.filter(l => l.status === status);
    }
    if (loanType && loanType !== 'ALL') {
      filtered = filtered.filter(l => l.loan_type === loanType);
    }
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(l => 
        l.application_number.toLowerCase().includes(s) ||
        l.applicant_name.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.phone.includes(s)
      );
    }
    return filtered;
  },

  updateStatus(id, newStatus, notes, officerName) {
    const loan = memoryLoans.find(l => l.id === parseInt(id, 10));
    if (!loan) return null;
    loan.status = newStatus;
    loan.officer_notes = notes || loan.officer_notes;
    loan.updated_at = new Date().toISOString();

    memoryHistory.push({
      id: memoryHistory.length + 1,
      application_id: loan.id,
      status: newStatus,
      comment: notes || `Status updated to ${newStatus}`,
      changed_by: officerName || 'Loan Underwriter',
      created_at: new Date().toISOString()
    });
    return loan;
  },

  getStats() {
    const totalApps = memoryLoans.length;
    const totalAmount = memoryLoans.reduce((sum, l) => sum + parseFloat(l.loan_amount || 0), 0);
    const approvedCount = memoryLoans.filter(l => l.status === 'APPROVED').length;
    const disbursedCount = memoryLoans.filter(l => l.status === 'DISBURSED').length;
    const pendingCount = memoryLoans.filter(l => ['PENDING_APPROVAL', 'AWAITING_APPROVAL', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_VERIFICATION'].includes(l.status)).length;
    const rejectedCount = memoryLoans.filter(l => l.status === 'REJECTED').length;

    return {
      totalApplications: totalApps,
      totalAmount: totalAmount,
      approvedCount: approvedCount,
      disbursedCount: disbursedCount,
      pendingCount: pendingCount,
      rejectedCount: rejectedCount
    };
  }
};

function getPool() {
  return pool;
}

function getStatus() {
  return {
    connected: isConnected,
    dbName: dbName,
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    lastError: lastError,
    activeMode: isConnected ? 'MySQL 8.0 Engine' : 'Local Fallback Engine'
  };
}

module.exports = {
  initDB,
  getPool,
  getStatus,
  memoryDB
};
