// Multi-step Application Logic

let currentStep = 1;
const ratesMap = {
  'Personal Loan': 11.50,
  'Home Loan': 8.40,
  'Auto Loan': 9.25,
  'Education Loan': 8.90,
  'Business Loan': 12.50,
};

let lastCreatedAppNumber = '';
let activeSelectedCustomerId = null;
let custSearchDebounce = null;

// Customer Search & Selection (Maker Tool)
function onCustomerSearchInput() {
  clearTimeout(custSearchDebounce);
  custSearchDebounce = setTimeout(() => {
    searchCustomerDatabase();
  }, 300);
}

async function searchCustomerDatabase() {
  const query = (document.getElementById('custSearchInput').value || '').trim();
  const resultsBox = document.getElementById('custSearchResults');

  if (!query) {
    resultsBox.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();

    if (json.success && json.data.length > 0) {
      resultsBox.style.display = 'block';
      resultsBox.innerHTML = json.data.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 10px;">
          <div>
            <div style="font-weight: 700; color: #fff;">
              <span style="background: rgba(79, 70, 229, 0.25); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace;">${c.customer_id}</span>
              ${c.name}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              📞 ${c.phone} • ✉️ ${c.email} • Income: ₹${c.monthly_income.toLocaleString('en-IN')}/mo • CIBIL: <strong style="color: #34d399;">${c.credit_score}</strong>
            </div>
          </div>
          <button type="button" class="btn btn-emerald btn-sm" style="padding: 4px 10px; font-size: 0.8rem; white-space: nowrap;" onclick='populateCustomerData(${JSON.stringify(c).replace(/'/g, "\\'")})'>
            Select Customer ➔
          </button>
        </div>
      `).join('');
    } else {
      resultsBox.style.display = 'block';
      resultsBox.innerHTML = `<div style="padding: 10px; color: var(--text-dim); text-align: center; font-size: 0.85rem;">No existing customers found matching "${query}".</div>`;
    }
  } catch (err) {
    showToast('Failed to search customers database.', 'error');
  }
}

async function selectCustomerDirectly(custId) {
  try {
    const res = await fetch(`/api/customers/${encodeURIComponent(custId)}`);
    const json = await res.json();
    if (json.success && json.data) {
      populateCustomerData(json.data);
    } else {
      showToast('Customer record not found.', 'error');
    }
  } catch (err) {
    showToast('Error retrieving customer record.', 'error');
  }
}

function populateCustomerData(c) {
  activeSelectedCustomerId = c.customer_id;

  // 1. Personal Details
  if (document.getElementById('applicantName')) document.getElementById('applicantName').value = c.name || '';
  if (document.getElementById('applicantEmail')) document.getElementById('applicantEmail').value = c.email || '';
  if (document.getElementById('applicantPhone')) document.getElementById('applicantPhone').value = c.phone || '';
  if (document.getElementById('applicantDob') && c.dob) {
    const dobStr = new Date(c.dob).toISOString().split('T')[0];
    document.getElementById('applicantDob').value = dobStr;
  }
  if (document.getElementById('applicantGender')) document.getElementById('applicantGender').value = c.gender || 'Male';
  if (document.getElementById('applicantPan')) document.getElementById('applicantPan').value = c.pan_id || '';
  if (document.getElementById('applicantAddress')) document.getElementById('applicantAddress').value = c.address || '';
  if (document.getElementById('applicantCity')) document.getElementById('applicantCity').value = c.city || '';
  if (document.getElementById('applicantState')) document.getElementById('applicantState').value = c.state || '';
  if (document.getElementById('applicantPincode')) document.getElementById('applicantPincode').value = c.pincode || '';

  // 2. Employment & Financial Details
  if (document.getElementById('employmentType')) document.getElementById('employmentType').value = c.employment_type || 'Salaried';
  if (document.getElementById('employerName')) document.getElementById('employerName').value = c.employer_name || '';
  if (document.getElementById('monthlyIncome')) document.getElementById('monthlyIncome').value = c.monthly_income || '';
  if (document.getElementById('existingEmis')) document.getElementById('existingEmis').value = c.existing_emis || 0;
  if (document.getElementById('creditScore')) {
    const cs = parseInt(c.credit_score, 10);
    if (cs >= 780) document.getElementById('creditScore').value = '780';
    else if (cs >= 720) document.getElementById('creditScore').value = '740';
    else if (cs >= 650) document.getElementById('creditScore').value = '680';
    else document.getElementById('creditScore').value = '620';
  }

  // Hide dropdown and show selected banner
  document.getElementById('custSearchResults').style.display = 'none';
  const banner = document.getElementById('selectedCustBanner');
  banner.style.display = 'flex';
  document.getElementById('linkedCustDetails').textContent = `[${c.customer_id}] ${c.name} (AC: ${c.account_number || 'Linked'}, CIBIL: ${c.credit_score})`;

  calculateFormEmi();
  showToast(`Customer details for ${c.name} (${c.customer_id}) retrieved from database!`, 'success');
}

function clearSelectedCustomer() {
  activeSelectedCustomerId = null;
  document.getElementById('selectedCustBanner').style.display = 'none';
  document.getElementById('custSearchInput').value = '';
  document.getElementById('applicantName').value = '';
  document.getElementById('applicantEmail').value = '';
  document.getElementById('applicantPhone').value = '';
  document.getElementById('applicantPan').value = '';
  document.getElementById('applicantAddress').value = '';
  document.getElementById('monthlyIncome').value = '';
  showToast('Customer selection cleared.', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const typeParam = params.get('type');
  const amountParam = params.get('amount');
  const tenureParam = params.get('tenure');
  const custParam = params.get('customerId') || params.get('customer');

  if (typeParam) {
    const loanTypeSelect = document.getElementById('loanType');
    if (loanTypeSelect) {
      for (let option of loanTypeSelect.options) {
        if (option.value.toLowerCase().includes(typeParam.toLowerCase())) {
          loanTypeSelect.value = option.value;
          break;
        }
      }
    }
  }

  if (amountParam) {
    const loanAmountInput = document.getElementById('loanAmount');
    if (loanAmountInput) loanAmountInput.value = amountParam;
  }

  if (tenureParam) {
    const tenureSelect = document.getElementById('tenureMonths');
    if (tenureSelect) tenureSelect.value = tenureParam;
  }

  if (custParam) {
    selectCustomerDirectly(custParam);
  }

  calculateFormEmi();
});

function updateStepUI() {
  // Update step indicators
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`stepIndicator${i}`);
    const content = document.getElementById(`stepContent${i}`);
    
    if (i === currentStep) {
      indicator.className = 'step-item active';
      content.style.display = 'block';
    } else if (i < currentStep) {
      indicator.className = 'step-item completed';
      content.style.display = 'none';
    } else {
      indicator.className = 'step-item';
      content.style.display = 'none';
    }
  }

  // Update progress bar
  const progressPercent = ((currentStep - 1) / 3) * 100;
  document.getElementById('stepperFill').style.width = `${progressPercent}%`;

  window.scrollTo({ top: 120, behavior: 'smooth' });
}

function nextStep(step) {
  if (step === 2) {
    const name = document.getElementById('applicantName').value.trim();
    const email = document.getElementById('applicantEmail').value.trim();
    const phone = document.getElementById('applicantPhone').value.trim();

    if (!name || !email || !phone) {
      showToast('Please fill in Name, Email and Phone Number.', 'error');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      showToast('Please provide a valid email address.', 'error');
      return;
    }
  } else if (step === 3) {
    const income = document.getElementById('monthlyIncome').value;
    if (!income || parseFloat(income) <= 0) {
      showToast('Please enter your net monthly income.', 'error');
      return;
    }
  }

  currentStep = step;
  updateStepUI();
}

function prevStep(step) {
  currentStep = step;
  updateStepUI();
}

function jumpToStep(step) {
  if (step < currentStep) {
    currentStep = step;
    updateStepUI();
  }
}

function calculateFormEmi() {
  const loanType = document.getElementById('loanType').value;
  const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
  const tenure = parseInt(document.getElementById('tenureMonths').value, 10) || 12;
  const rate = ratesMap[loanType] || 10.50;

  const monthlyRate = (rate / 12) / 100;
  let emi = 0;
  if (amount > 0 && tenure > 0) {
    const factor = Math.pow(1 + monthlyRate, tenure);
    emi = (amount * monthlyRate * factor) / (factor - 1);
  }

  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - (parseFloat(document.getElementById('loanAmount').value) || 0);

  const emiEl = document.getElementById('formLiveEmi');
  const rateEl = document.getElementById('formLiveRate');
  const tenureEl = document.getElementById('formLiveTenure');
  const totalEl = document.getElementById('formLiveTotal');
  if (emiEl) emiEl.textContent = `${formatCurrency(emi)} / mo`;
  if (rateEl) rateEl.textContent = `${rate.toFixed(2)}%`;
  if (tenureEl) tenureEl.textContent = `${tenure} Mos`;
  if (totalEl) totalEl.textContent = formatCurrency(totalPayable);
}

function prepareReviewStep() {
  const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
  if (amount < 25000) {
    showToast('Minimum loan amount is ₹25,000.', 'error');
    return;
  }

  const remarksEl = document.getElementById('makerRemarks');
  const remarksValue = remarksEl ? remarksEl.value.trim() : '';
  if (!remarksValue) {
    showToast('Please enter Maker Appraisal Remarks before proceeding.', 'error');
    if (remarksEl) remarksEl.focus();
    return;
  }

  const name = document.getElementById('applicantName').value;
  const email = document.getElementById('applicantEmail').value;
  const phone = document.getElementById('applicantPhone').value;
  const employment = document.getElementById('employmentType').value;
  const income = parseFloat(document.getElementById('monthlyIncome').value) || 0;
  const existingEmis = parseFloat(document.getElementById('existingEmis').value) || 0;
  const loanType = document.getElementById('loanType').value;
  const tenure = document.getElementById('tenureMonths').value;
  const rate = ratesMap[loanType] || 10.50;

  const monthlyRate = (rate / 12) / 100;
  const factor = Math.pow(1 + monthlyRate, tenure);
  const emi = (amount * monthlyRate * factor) / (factor - 1);

  const card = document.getElementById('reviewSummaryCard');
  card.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Applicant Name</span>
        <div style="font-weight: 700; color: #fff;">${name}</div>
      </div>
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Contact</span>
        <div style="font-weight: 600; color: #fff;">${phone}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${email}</div>
      </div>
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Employment & Income</span>
        <div style="font-weight: 600; color: #fff;">${employment}</div>
        <div style="font-size: 0.8rem; color: var(--accent-emerald);">Net: ${formatCurrency(income)}/mo</div>
      </div>
    </div>
    <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Loan Category</span>
        <div style="font-weight: 700; color: var(--primary-light);">${loanType}</div>
      </div>
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Sanction Amount</span>
        <div style="font-weight: 800; font-size: 1.2rem; color: #fff;">${formatCurrency(amount)}</div>
      </div>
      <div>
        <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Tenure & Monthly EMI</span>
        <div style="font-weight: 700; color: var(--accent-emerald); font-size: 1.15rem;">${formatCurrency(emi)} / mo</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${tenure} Months @ ${rate}% p.a.</div>
      </div>
    </div>
    ${activeSelectedCustomerId ? `
    <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 0.78rem; background: rgba(6,182,212,0.15); color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-weight: 700;">🔗 LINKED CUSTOMER: ${activeSelectedCustomerId}</span>
    </div>` : ''}
    ${remarksValue ? `
    <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 4px;">
      <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Maker Appraisal Remarks</span>
      <div style="font-size: 0.88rem; color: #d1d5db; margin-top: 4px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border-left: 3px solid var(--primary);">"${remarksValue}"</div>
    </div>` : ''}
    <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 8px; text-align: center;">
      <span style="font-size: 0.8rem; background: rgba(234,179,8,0.15); color: #fbbf24; padding: 4px 12px; border-radius: 20px; font-weight: 700; letter-spacing: 0.5px;">⏳ Status after submission: PENDING_APPROVAL</span>
    </div>
  `;

  currentStep = 4;
  updateStepUI();
}

async function submitApplication() {
  // Support both termsConsent (apply.html) and makerCertify (maker.html)
  const terms = document.getElementById('termsConsent') || document.getElementById('makerCertify');
  if (terms && !terms.checked) {
    showToast('Please check the authorization consent to proceed.', 'error');
    return;
  }

  const btn = document.getElementById('submitApplicationBtn');
  btn.disabled = true;
  btn.textContent = 'Saving to MySQL...';

  const remarksEl = document.getElementById('makerRemarks');
  const remarksValue = remarksEl ? remarksEl.value.trim() : '';

  const payload = {
    applicant_name: document.getElementById('applicantName').value,
    email: document.getElementById('applicantEmail').value,
    phone: document.getElementById('applicantPhone').value,
    dob: document.getElementById('applicantDob').value || null,
    gender: document.getElementById('applicantGender').value,
    pan_or_id: document.getElementById('applicantPan').value || null,
    address: document.getElementById('applicantAddress').value || null,
    city: document.getElementById('applicantCity').value || null,
    state: document.getElementById('applicantState').value || null,
    pincode: document.getElementById('applicantPincode').value || null,
    employment_type: document.getElementById('employmentType').value,
    employer_name: document.getElementById('employerName').value || null,
    monthly_income: parseFloat(document.getElementById('monthlyIncome').value),
    existing_emis: parseFloat(document.getElementById('existingEmis').value || 0),
    credit_score: parseInt(document.getElementById('creditScore').value, 10),
    loan_type: document.getElementById('loanType').value,
    loan_amount: parseFloat(document.getElementById('loanAmount').value),
    tenure_months: parseInt(document.getElementById('tenureMonths').value, 10),
    loan_purpose: remarksValue || null,
    remarks: remarksValue || null,
    customer_id: activeSelectedCustomerId || null
  };

  try {
    const token = localStorage.getItem('apex_jwt_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      lastCreatedAppNumber = data.data.applicationNumber;

      // If on maker.html — use maker's success callback
      if (typeof window._makerSuccessCallback === 'function') {
        window._makerSuccessCallback(lastCreatedAppNumber);
      } else {
        // Standard apply.html success flow
        const appNumEl = document.getElementById('modalAppNumber');
        if (appNumEl) appNumEl.textContent = lastCreatedAppNumber;
        const trackBtn = document.getElementById('trackNowBtn');
        if (trackBtn) trackBtn.href = `track.html?query=${encodeURIComponent(lastCreatedAppNumber)}`;
        const modal = document.getElementById('successModal');
        if (modal) modal.classList.add('active');
      }
    } else {
      showToast(data.message || 'Failed to submit loan application.', 'error');
    }
  } catch (err) {
    showToast('Server communication error. Check if the server is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = btn.getAttribute('data-original-text') || 'Submit Loan for Approval (PENDING_APPROVAL) ➔';
  }
}

function copyAppId() {
  if (!lastCreatedAppNumber) return;
  navigator.clipboard.writeText(lastCreatedAppNumber).then(() => {
    const copyBtn = document.getElementById('copyIdBtn');
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy Reference ID';
    }, 2000);
    showToast('Application ID copied to clipboard!', 'success');
  });
}
