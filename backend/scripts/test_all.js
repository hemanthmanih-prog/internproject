const http = require('http');

async function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, data: json || data });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runAllTests() {
  console.log('========================================================');
  console.log('   APEXLOAN SYSTEM TEST SUITE — ALL SUBSYSTEMS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, ok, details = '') {
    if (ok) {
      console.log(`✅ [PASS] ${name} ${details ? '— ' + details : ''}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // 1. Static Pages
  console.log('--- 1. Testing Frontend Static Pages ---');
  const pages = [
    '/',
    '/index.html',
    '/auth.html',
    '/maker.html',
    '/checker.html',
    '/apply.html',
    '/track.html',
    '/admin.html'
  ];

  for (const page of pages) {
    try {
      const res = await request(page);
      report(`GET ${page}`, res.status === 200, `Status: ${res.status}`);
    } catch (e) {
      report(`GET ${page}`, false, e.message);
    }
  }

  // 2. Authentication
  console.log('\n--- 2. Testing Authentication Workflows ---');
  let checkerToken = '';
  let makerToken = '';

  // 2a. Checker valid login
  try {
    const res = await request('/api/auth/login', { method: 'POST' }, {
      email: 'hemanthmanih@gmail.com',
      password: '24CSE019'
    });
    const ok = res.status === 200 && res.data.success && res.data.user.role === 'CHECKER';
    checkerToken = res.data.token || '';
    report('Checker Login (hemanthmanih@gmail.com / 24CSE019)', ok, `Role: ${res.data.user?.role}`);
  } catch (e) {
    report('Checker Login', false, e.message);
  }

  // 2b. Checker invalid password
  try {
    const res = await request('/api/auth/login', { method: 'POST' }, {
      email: 'hemanthmanih@gmail.com',
      password: 'WRONG_PASSWORD_XYZ'
    });
    report('Checker Invalid Password Blocked', res.status === 401 && !res.data.success, `Status: ${res.status}`);
  } catch (e) {
    report('Checker Invalid Password Blocked', false, e.message);
  }

  // 2c. Maker login (any gmail & any password)
  try {
    const res = await request('/api/auth/login', { method: 'POST' }, {
      email: 'custommaker@gmail.com',
      password: 'mySecretPassword99'
    });
    const ok = res.status === 200 && res.data.success && res.data.user.role === 'MAKER';
    makerToken = res.data.token || '';
    report('Maker Login with ANY Gmail (custommaker@gmail.com)', ok, `Role: ${res.data.user?.role}`);
  } catch (e) {
    report('Maker Login with ANY Gmail', false, e.message);
  }

  // 3. API & Data Access
  console.log('\n--- 3. Testing API Endpoints & Role Authorization ---');

  // 3a. Checker queue
  try {
    const res = await request('/api/all', {
      headers: { 'Authorization': `Bearer ${checkerToken}` }
    });
    const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    report('Checker Queue (/api/all)', res.status === 200 && res.data.success, `Loaded ${count} loan applications`);
  } catch (e) {
    report('Checker Queue (/api/all)', false, e.message);
  }

  // 3b. Customer search
  try {
    const res = await request('/api/customers/search?q=Aarav');
    const matches = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    report('Customer Search (/api/customers/search)', res.status === 200 && res.data.success, `Found ${matches} match(es)`);
  } catch (e) {
    report('Customer Search', false, e.message);
  }

  // 3c. Loan application submission
  let createdAppNumber = '';
  try {
    const res = await request('/api/apply', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${makerToken}` }
    }, {
      applicant_name: 'Rohit Verma',
      email: 'rohit.verma@example.com',
      phone: '9812345678',
      loan_amount: 500000,
      tenure_months: 24,
      interest_rate: 10.5,
      loan_type: 'Personal Loan',
      monthly_income: 75000,
      employment_type: 'Salaried'
    });
    const ok = (res.status === 200 || res.status === 201) && res.data.success;
    createdAppNumber = res.data?.data?.applicationNumber || res.data?.data?.application_number || '';
    report('Submit Loan Application (/api/apply)', ok, `Created ID: ${createdAppNumber}`);
  } catch (e) {
    report('Submit Loan Application', false, e.message);
  }

  // 3d. Track application status
  try {
    const trackQuery = createdAppNumber || 'LN-';
    const res = await request(`/api/track?query=${encodeURIComponent(trackQuery)}`);
    const ok = res.status === 200 && res.data.success;
    report(`Track Application (/api/track?query=${trackQuery})`, ok, `Status: ${res.data?.data?.application?.status || 'FOUND'}`);
  } catch (e) {
    report('Track Application', false, e.message);
  }

  console.log('\n========================================================');
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL SYSTEMS ARE FULLY OPERATIONAL AND RUNNING SMOOTHLY!');
  }
}

runAllTests();
