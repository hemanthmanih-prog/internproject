const { getPool, getStatus, memoryDB } = require('../config/db');

// Interest rates by loan category (per annum)
const DEFAULT_RATES = {
  'Personal Loan': 11.50,
  'Home Loan': 8.40,
  'Auto Loan': 9.25,
  'Education Loan': 8.90,
  'Business Loan': 12.50,
};

function calculateEmiValue(principal, annualRate, tenureMonths) {
  const monthlyRate = (annualRate / 12) / 100;
  if (monthlyRate === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

// 1. Check DB Health
exports.checkHealth = async (req, res) => {
  const status = getStatus();
  res.json({
    success: true,
    mysql: status,
    timestamp: new Date().toISOString()
  });
};

// 2. Calculate EMI endpoint
exports.calculateEmi = (req, res) => {
  try {
    const { amount, rate, tenureMonths } = req.body;
    const P = parseFloat(amount);
    const R = parseFloat(rate);
    const N = parseInt(tenureMonths, 10);

    if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || R <= 0 || N <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid calculation inputs' });
    }

    const emi = calculateEmiValue(P, R, N);
    const totalPayable = Math.round((emi * N) * 100) / 100;
    const totalInterest = Math.round((totalPayable - P) * 100) / 100;

    res.json({
      success: true,
      data: {
        loanAmount: P,
        annualRate: R,
        tenureMonths: N,
        monthlyEmi: emi,
        totalInterest: totalInterest,
        totalPayable: totalPayable
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Submit New Loan Application
exports.submitLoanApplication = async (req, res) => {
  try {
    const {
      applicant_name,
      email,
      phone,
      dob,
      gender,
      pan_or_id,
      address,
      city,
      state,
      pincode,
      employment_type,
      employer_name,
      monthly_income,
      existing_emis,
      credit_score,
      loan_type,
      loan_amount,
      tenure_months,
      loan_purpose,
      remarks
    } = req.body;

    // Validation
    if (!applicant_name || !email || !phone || !monthly_income || !loan_type || !loan_amount || !tenure_months) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.'
      });
    }

    const amount = parseFloat(loan_amount);
    const tenure = parseInt(tenure_months, 10);
    const income = parseFloat(monthly_income);
    const emis = parseFloat(existing_emis || 0);
    const score = parseInt(credit_score || 750, 10);
    const rate = DEFAULT_RATES[loan_type] || 10.50;
    const emi = calculateEmiValue(amount, rate, tenure);

    // Initial Status is PENDING_APPROVAL
    const initialStatus = 'PENDING_APPROVAL';
    const makerRemarks = remarks || loan_purpose || 'Loan proposal created by Maker and submitted for Checker approval.';
    const submitterName = (req.user && req.user.name) ? req.user.name : (req.body.submitted_by || 'Hemanth (Maker)');
    const submitterEmail = (req.user && req.user.email) ? req.user.email : 'hemanthmanih@gmail.com';
    const submitterId = (req.user && req.user.id) ? req.user.id : 1;
    const customerId = req.body.customer_id || (pan_or_id ? 'CUST-' + pan_or_id.substring(0, 4) : 'CUST-1001');

    // Generate Unique Application Number: LN-YYYY-XXXXX
    const year = new Date().getFullYear();
    const randomHex = Math.floor(10000 + Math.random() * 90000);
    const applicationNumber = `LN-${year}-${randomHex}`;

    const pool = getPool();
    let newAppId = null;

    if (pool) {
      const insertSql = `
        INSERT INTO loan_applications 
        (application_number, applicant_name, email, phone, dob, gender, pan_or_id, address, city, state, pincode, employment_type, employer_name, monthly_income, existing_emis, credit_score, loan_type, loan_amount, tenure_months, interest_rate, monthly_emi, loan_purpose, status, officer_notes, customer_id, created_by_name, created_by_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      try {
        const [result] = await pool.query(insertSql, [
          applicationNumber,
          applicant_name.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          dob || null,
          gender || 'Other',
          pan_or_id ? pan_or_id.trim().toUpperCase() : null,
          address || null,
          city || null,
          state || null,
          pincode || null,
          employment_type,
          employer_name || null,
          income,
          emis,
          score,
          loan_type,
          amount,
          tenure,
          rate,
          emi,
          loan_purpose || null,
          initialStatus,
          makerRemarks,
          customerId,
          submitterName,
          submitterEmail
        ]);
        newAppId = result.insertId;
      } catch (insertErr) {
        // Fallback if extra columns don't exist yet
        const [fallbackRes] = await pool.query(`
          INSERT INTO loan_applications 
          (application_number, applicant_name, email, phone, dob, gender, pan_or_id, address, city, state, pincode, employment_type, employer_name, monthly_income, existing_emis, credit_score, loan_type, loan_amount, tenure_months, interest_rate, monthly_emi, loan_purpose, status, officer_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          applicationNumber, applicant_name.trim(), email.trim().toLowerCase(), phone.trim(), dob || null, gender || 'Other',
          pan_or_id ? pan_or_id.trim().toUpperCase() : null, address || null, city || null, state || null, pincode || null,
          employment_type, employer_name || null, income, emis, score, loan_type, amount, tenure, rate, emi,
          loan_purpose || null, initialStatus, makerRemarks
        ]);
        newAppId = fallbackRes.insertId;
      }

      await pool.query(
        `INSERT INTO loan_status_history (application_id, status, comment, changed_by) VALUES (?, ?, ?, ?)`,
        [newAppId, initialStatus, makerRemarks, submitterName]
      );
    } else {
      // Memory Store fallback
      const record = memoryDB.createApplication({
        application_number: applicationNumber,
        customer_id: customerId,
        applicant_name: applicant_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        dob: dob || null,
        gender: gender || 'Other',
        pan_or_id: pan_or_id ? pan_or_id.trim().toUpperCase() : null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        employment_type: employment_type,
        employer_name: employer_name || null,
        monthly_income: income,
        existing_emis: emis,
        credit_score: score,
        loan_type: loan_type,
        loan_amount: amount,
        tenure_months: tenure,
        interest_rate: rate,
        monthly_emi: emi,
        loan_purpose: loan_purpose || null,
        status: initialStatus,
        officer_notes: makerRemarks,
        submitted_by: submitterName,
        created_by_name: submitterName,
        created_by_email: submitterEmail,
        created_by_id: submitterId
      });
      newAppId = record.id;
    }

    res.status(201).json({
      success: true,
      message: 'Loan proposal created successfully and submitted for approval! Current status: PENDING_APPROVAL.',
      data: {
        applicationId: newAppId,
        applicationNumber,
        applicantName: applicant_name,
        loanType: loan_type,
        loanAmount: amount,
        tenureMonths: tenure,
        interestRate: rate,
        monthlyEmi: emi,
        status: initialStatus,
        remarks: makerRemarks,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
};

// 4. Track Application by Number, Phone, Email, or Maker ID
exports.trackLoanApplication = async (req, res) => {
  try {
    const rawQuery = req.query.query || req.params.id || req.query.application_number || req.query.q;
    if (!rawQuery || !rawQuery.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide an Application ID, Customer ID, Maker ID, or Email/Phone.' });
    }

    const trimmedQuery = rawQuery.trim();
    const pool = getPool();

    let mainLoan = null;
    let history = [];
    let allMatches = [];
    let makerAudit = null;

    if (pool) {
      const [loans] = await pool.query(
        `SELECT * FROM loan_applications 
         WHERE application_number = ? 
            OR email = ? 
            OR phone = ? 
            OR customer_id = ? 
            OR created_by_email = ? 
            OR CAST(created_by_id AS CHAR) = ?
            OR created_by_name LIKE ?
         ORDER BY created_at DESC LIMIT 20`,
        [
          trimmedQuery, 
          trimmedQuery.toLowerCase(), 
          trimmedQuery, 
          trimmedQuery.toUpperCase(), 
          trimmedQuery.toLowerCase(), 
          trimmedQuery, 
          `%${trimmedQuery}%`
        ]
      );

      if (loans.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No loan applications found matching "${trimmedQuery}". Please verify your search term.`
        });
      }

      mainLoan = loans[0];
      const [h] = await pool.query(
        `SELECT * FROM loan_status_history WHERE application_id = ? ORDER BY created_at ASC`,
        [mainLoan.id]
      );
      history = h;
      allMatches = loans.map(l => ({ 
        id: l.id,
        application_number: l.application_number, 
        applicant_name: l.applicant_name,
        loan_type: l.loan_type, 
        loan_amount: l.loan_amount, 
        status: l.status, 
        created_at: l.created_at,
        created_by_id: l.created_by_id,
        created_by_name: l.created_by_name,
        created_by_email: l.created_by_email
      }));

      // Fetch complete Maker history & stats
      const makerId = mainLoan.created_by_id || 1;
      const makerEmail = mainLoan.created_by_email || 'hemanthmanih@gmail.com';
      const [makerLoans] = await pool.query(
        `SELECT id, application_number, applicant_name, loan_type, loan_amount, monthly_emi, status, created_at, officer_notes 
         FROM loan_applications 
         WHERE created_by_id = ? OR created_by_email = ?
         ORDER BY created_at DESC`,
        [makerId, makerEmail]
      );

      const approvedCount = makerLoans.filter(l => l.status === 'APPROVED' || l.status === 'DISBURSED').length;
      const rejectedCount = makerLoans.filter(l => l.status === 'REJECTED').length;
      const pendingCount = makerLoans.filter(l => ['PENDING_APPROVAL', 'UNDER_REVIEW', 'DOCS_VERIFICATION', 'SUBMITTED'].includes(l.status)).length;
      const totalAmount = makerLoans.reduce((sum, l) => sum + parseFloat(l.loan_amount || 0), 0);

      makerAudit = {
        maker_id: makerId,
        maker_name: mainLoan.created_by_name || 'Hemanth (Maker)',
        maker_email: makerEmail,
        total_originated: makerLoans.length,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        pending_count: pendingCount,
        total_amount: totalAmount,
        approval_rate: makerLoans.length > 0 ? Math.round((approvedCount / makerLoans.length) * 100) : 0,
        history_loans: makerLoans
      };

    } else {
      const matches = memoryDB.findApplication(trimmedQuery);
      if (matches.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No loan applications found matching "${trimmedQuery}". Please verify your search term.`
        });
      }

      mainLoan = matches[0];
      history = memoryDB.getHistory(mainLoan.id);
      allMatches = matches.map(l => ({ 
        id: l.id,
        application_number: l.application_number, 
        applicant_name: l.applicant_name,
        loan_type: l.loan_type, 
        loan_amount: l.loan_amount, 
        status: l.status, 
        created_at: l.created_at,
        created_by_id: l.created_by_id,
        created_by_name: l.created_by_name,
        created_by_email: l.created_by_email
      }));

      // Fetch complete Maker history & stats
      const makerEmail = mainLoan.created_by_email || 'hemanthmanih@gmail.com';
      const makerLoans = memoryDB.getLoansByMaker(makerEmail);
      const approvedCount = makerLoans.filter(l => l.status === 'APPROVED' || l.status === 'DISBURSED').length;
      const rejectedCount = makerLoans.filter(l => l.status === 'REJECTED').length;
      const pendingCount = makerLoans.filter(l => ['PENDING_APPROVAL', 'UNDER_REVIEW', 'DOCS_VERIFICATION', 'SUBMITTED'].includes(l.status)).length;
      const totalAmount = makerLoans.reduce((sum, l) => sum + parseFloat(l.loan_amount || 0), 0);

      makerAudit = {
        maker_id: mainLoan.created_by_id || 1,
        maker_name: mainLoan.created_by_name || 'Hemanth (Maker)',
        maker_email: makerEmail,
        total_originated: makerLoans.length,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        pending_count: pendingCount,
        total_amount: totalAmount,
        approval_rate: makerLoans.length > 0 ? Math.round((approvedCount / makerLoans.length) * 100) : 0,
        history_loans: makerLoans
      };
    }

    res.json({
      success: true,
      data: {
        application: mainLoan,
        history: history,
        allMatches: allMatches,
        makerAudit: makerAudit
      }
    });
  } catch (err) {
    console.error('Error tracking loan:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4b. Checker: Get Maker Performance & History Profile
exports.getMakerHistory = async (req, res) => {
  try {
    const { maker } = req.query;
    const pool = getPool();
    const makerQuery = maker ? maker.trim() : 'hemanthmanih@gmail.com';

    let makerLoans = [];
    if (pool) {
      const [rows] = await pool.query(
        `SELECT * FROM loan_applications 
         WHERE created_by_email = ? OR CAST(created_by_id AS CHAR) = ? OR created_by_name LIKE ?
         ORDER BY created_at DESC`,
        [makerQuery.toLowerCase(), makerQuery, `%${makerQuery}%`]
      );
      makerLoans = rows;
    } else {
      makerLoans = memoryDB.getLoansByMaker(makerQuery);
    }

    const approvedCount = makerLoans.filter(l => l.status === 'APPROVED' || l.status === 'DISBURSED').length;
    const rejectedCount = makerLoans.filter(l => l.status === 'REJECTED').length;
    const pendingCount = makerLoans.filter(l => ['PENDING_APPROVAL', 'UNDER_REVIEW', 'DOCS_VERIFICATION', 'SUBMITTED'].includes(l.status)).length;
    const totalAmount = makerLoans.reduce((sum, l) => sum + parseFloat(l.loan_amount || 0), 0);

    const firstLoan = makerLoans[0] || {};

    res.json({
      success: true,
      data: {
        maker_id: firstLoan.created_by_id || 1,
        maker_name: firstLoan.created_by_name || 'Hemanth (Maker)',
        maker_email: firstLoan.created_by_email || 'hemanthmanih@gmail.com',
        total_originated: makerLoans.length,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        pending_count: pendingCount,
        total_amount: totalAmount,
        approval_rate: makerLoans.length > 0 ? Math.round((approvedCount / makerLoans.length) * 100) : 0,
        loans: makerLoans
      }
    });
  } catch (err) {
    console.error('Error fetching maker history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Get All Loans (Admin / Officer view)
exports.getAllLoans = async (req, res) => {
  try {
    const { status, loan_type, search } = req.query;
    const pool = getPool();

    if (pool) {
      let sql = 'SELECT * FROM loan_applications WHERE 1=1';
      const params = [];

      if (status && status !== 'ALL') {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (loan_type && loan_type !== 'ALL') {
        sql += ' AND loan_type = ?';
        params.push(loan_type);
      }

      if (search && search.trim()) {
        sql += ' AND (application_number LIKE ? OR applicant_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s, s);
      }

      sql += ' ORDER BY created_at DESC';

      const [loans] = await pool.query(sql, params);

      const [statsRows] = await pool.query(`
        SELECT 
          COUNT(*) as totalApplications,
          COALESCE(SUM(loan_amount), 0) as totalAmount,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
          SUM(CASE WHEN status = 'DISBURSED' THEN 1 ELSE 0 END) as disbursedCount,
          SUM(CASE WHEN status = 'UNDER_REVIEW' OR status = 'DOCS_VERIFICATION' OR status = 'SUBMITTED' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount
        FROM loan_applications
      `);

      res.json({
        success: true,
        stats: statsRows[0],
        data: loans
      });
    } else {
      const loans = memoryDB.getAll(status, loan_type, search);
      const stats = memoryDB.getStats();

      res.json({
        success: true,
        stats: stats,
        data: loans
      });
    }
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Update Loan Status (Enforces Maker-Checker Four-Eyes Principle)
exports.updateLoanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, reason, officerName } = req.body;
    const rejectionReason = (reason || notes || '').trim();
    const userRole = req.user ? (req.user.role || '').toUpperCase() : null;
    const userEmail = req.user ? (req.user.email || '').toLowerCase() : null;
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? (req.user.name || '').toLowerCase() : null;

    const validStatuses = ['PENDING_APPROVAL', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_VERIFICATION', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }

    // Rule 1: The checker must provide a reason when rejecting a loan.
    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required. The checker must provide a clear reason when rejecting a loan.'
      });
    }

    // Rule 2: A maker cannot approve loans (Only Checker can approve or disburse)
    if (userRole === 'MAKER' && (status === 'APPROVED' || status === 'DISBURSED')) {
      return res.status(403).json({
        success: false,
        message: 'A maker cannot approve loans. Only a Checker can authorize and approve or reject loan proposals.'
      });
    }

    const pool = getPool();
    let existing = null;

    if (pool) {
      const [rows] = await pool.query('SELECT * FROM loan_applications WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Loan application not found.' });
      }
      existing = rows[0];
    } else {
      existing = memoryDB.getAll('ALL', 'ALL', '').find(l => l.id === parseInt(id, 10));
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Loan application not found.' });
      }
    }

    // Rule 3: A maker cannot approve their own loan
    // Even if a user holds Checker privileges, if they are the originator/maker of this specific loan, they cannot approve it.
    const creatorEmail = (existing.created_by_email || '').toLowerCase();
    const creatorId = existing.created_by_id;
    const creatorName = (existing.created_by_name || existing.submitted_by || '').toLowerCase();

    const isSelfApproval = (userId && creatorId && userId === creatorId) ||
                           (userEmail && creatorEmail && userEmail === creatorEmail) ||
                           (userName && creatorName && (creatorName.includes(userName) || userName.includes(creatorName)));

    if (isSelfApproval && (status === 'APPROVED' || status === 'DISBURSED')) {
      return res.status(403).json({
        success: false,
        message: 'Maker-Checker Segregation Violation: A maker cannot approve their own loan. An independent Checker must authorize this loan.'
      });
    }

    const finalNotes = status === 'REJECTED' ? rejectionReason : (notes || `Status updated to ${status}`);
    const actingOfficer = officerName || (req.user ? `${req.user.name} (${req.user.role})` : 'Authorized Checker');

    if (pool) {
      await pool.query(
        `UPDATE loan_applications SET status = ?, officer_notes = ? WHERE id = ?`,
        [status, finalNotes, id]
      );

      await pool.query(
        `INSERT INTO loan_status_history (application_id, status, comment, changed_by) VALUES (?, ?, ?, ?)`,
        [id, status, finalNotes, actingOfficer]
      );

      res.json({
        success: true,
        message: `Application ${existing.application_number} status updated to ${status}.`
      });
    } else {
      const updated = memoryDB.updateStatus(id, status, finalNotes, actingOfficer);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Loan application not found.' });
      }

      res.json({
        success: true,
        message: `Application ${updated.application_number} status successfully updated to ${status}.`,
        data: updated
      });
    }
  } catch (err) {
    console.error('Error updating loan status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
