// Maker & Checker Loan Console Logic

let allLoans = [];
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  setupRoleInterface();
  loadApplications();
  startLiveSync();
});

function getRole() {
  const user = getCurrentUser();
  return user ? (user.role || '').toUpperCase() : null;
}

function setupRoleInterface() {
  const user = getCurrentUser();
  const role = getRole();
  const banner = document.getElementById('roleActionBanner');
  const roleTag = document.getElementById('navRoleTag');
  const quickActions = document.getElementById('roleQuickActionContainer');
  const actionHeader = document.getElementById('thActionHeader');

  if (role === 'MAKER') {
    roleTag.textContent = 'MAKER Console';
    roleTag.style.color = '#38bdf8';
    roleTag.style.background = 'rgba(6, 182, 212, 0.2)';

    banner.className = 'role-action-banner banner-maker';
    banner.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
          <span>🛠️</span> Active Role: <strong>MAKER</strong> (${user.name})
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
          <strong>Maker Functions:</strong> Originate loan proposals, verify borrower KYC & documents, enter appraisal notes, and escalate to Checker for sanction.
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="openCustomerSearchModal()" style="border-color: #38bdf8;">
          🔍 Lookup Customer Master
        </button>
        <a href="apply.html" class="btn btn-primary btn-sm">
          + Originate New Loan ➔
        </a>
      </div>
    `;

    quickActions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openCustomerSearchModal()" style="border-color: #38bdf8;">
        👥 Search Customers
      </button>
      <a href="apply.html" class="btn btn-secondary btn-sm" style="border-color: #38bdf8;">
        + New Loan Application
      </a>
    `;

    if (actionHeader) actionHeader.textContent = 'Maker Action';

  } else if (role === 'CHECKER') {
    roleTag.textContent = 'CHECKER Console';
    roleTag.style.color = '#34d399';
    roleTag.style.background = 'rgba(16, 185, 129, 0.2)';

    banner.className = 'role-action-banner banner-checker';
    banner.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
          <span>🛡️</span> Active Role: <strong>CHECKER</strong> (${user.name})
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
          <strong>Checker Functions (Four-Eyes):</strong> Review Maker appraisal findings, issue final <strong>Approval</strong> or <strong>Rejection</strong>, and authorize <strong>Disbursement</strong>.
        </p>
      </div>
      <div>
        <button class="btn btn-emerald btn-sm" onclick="filterAwaitingApproval()">
          ⚡ Filter: Awaiting My Approval
        </button>
      </div>
    `;

    quickActions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="filterAwaitingApproval()" style="border-color: #34d399;">
        ⚡ Awaiting Checker Queue
      </button>
    `;

    if (actionHeader) actionHeader.textContent = 'Checker Decision';

  } else {
    roleTag.textContent = 'Portfolio Console';
    banner.className = 'role-action-banner banner-guest';
    banner.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 1.05rem;">
          ⚖️ Four-Eyes Authorization Standard
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
          Please sign in through the Staff Gateway with your authorized Maker or Checker credentials.
        </p>
      </div>
      <div>
        <a href="auth.html" class="btn btn-primary btn-sm" style="text-decoration: none;">
          Sign In to Staff Gateway ➔
        </a>
      </div>
    `;
  }
}

// Status Tab Filtering
function setStatusTab(status, btnEl) {
  const filterSelect = document.getElementById('filterStatus');
  if (filterSelect) filterSelect.value = status;

  // Update active chip style
  document.querySelectorAll('.filter-tab-chip').forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  loadApplications();
}

function onStatusDropdownChange() {
  const status = document.getElementById('filterStatus').value;
  // Sync the tabs
  document.querySelectorAll('.filter-tab-chip').forEach(c => {
    c.classList.remove('active');
    const chipStatus = c.getAttribute('onclick');
    if (chipStatus && chipStatus.includes(`'${status}'`)) {
      c.classList.add('active');
    }
  });
  loadApplications();
}

function filterCheckerQueue() {
  setStatusTab('PENDING_APPROVAL', document.querySelector('.filter-tab-chip[onclick*="PENDING_APPROVAL"]'));
}

function filterAwaitingApproval() {
  filterCheckerQueue();
}

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadApplications();
  }, 350);
}

// Real-time synchronization
let liveSyncInterval = null;
let isLiveSyncActive = true;

function startLiveSync() {
  if (liveSyncInterval) clearInterval(liveSyncInterval);
  liveSyncInterval = setInterval(() => {
    // Only auto-refresh if tab is active and review modal is not currently open
    const modal = document.getElementById('reviewModal');
    const isModalOpen = modal && modal.classList.contains('active');
    if (isLiveSyncActive && !isModalOpen && !document.hidden) {
      loadApplications(true); // silent refresh
    }
  }, 3000);
}

function toggleLiveSync() {
  isLiveSyncActive = !isLiveSyncActive;
  const dot = document.getElementById('liveSyncDot');
  const text = document.getElementById('liveSyncText');
  const btn = document.getElementById('btnLiveSync');

  if (isLiveSyncActive) {
    if (dot) {
      dot.style.background = '#34d399';
      dot.style.boxShadow = '0 0 8px #34d399';
    }
    if (text) text.textContent = 'Live (3s)';
    if (btn) {
      btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      btn.style.color = '#34d399';
    }
    showToast('Real-time sync resumed (3s interval)', 'info');
    loadApplications();
  } else {
    if (dot) {
      dot.style.background = '#94a3b8';
      dot.style.boxShadow = 'none';
    }
    if (text) text.textContent = 'Paused';
    if (btn) {
      btn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      btn.style.color = '#94a3b8';
    }
    showToast('Real-time sync paused', 'info');
  }
}

async function loadApplications(isSilent = false) {
  const status = document.getElementById('filterStatus').value;
  const loanType = document.getElementById('filterType').value;
  const search = document.getElementById('tableSearch').value;

  const params = new URLSearchParams();
  if (status !== 'ALL') params.append('status', status);
  if (loanType !== 'ALL') params.append('loan_type', loanType);
  if (search.trim()) params.append('search', search.trim());

  try {
    const res = await fetch(`/api/all?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (data.success) {
      allLoans = data.data || [];
      renderStats(data.stats, allLoans);
      renderTable(allLoans);
    } else if (!isSilent) {
      showToast(data.message || 'Failed to fetch loan records.', 'error');
    }
  } catch (err) {
    if (!isSilent) {
      showToast('Could not reach backend API.', 'error');
    }
  }
}

function renderStats(stats, loans) {
  if (!stats) return;
  document.getElementById('statTotalApps').textContent = stats.totalApplications || 0;
  document.getElementById('statTotalAmount').textContent = formatCurrency(stats.totalAmount || 0);

  // Count pending items needing Checker action
  const pendingCount = loans.filter(l =>
    l.status === 'PENDING_APPROVAL' || l.status === 'AWAITING_APPROVAL'
  ).length;
  document.getElementById('statAwaitingApps').textContent = pendingCount;

  // Update filter tab count badges
  const setTabCount = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };
  setTabCount('tabCountAll', stats.totalApplications || loans.length);
  setTabCount('tabCountPending', loans.filter(l => l.status === 'PENDING_APPROVAL' || l.status === 'AWAITING_APPROVAL').length);
  setTabCount('tabCountReview', loans.filter(l => l.status === 'UNDER_REVIEW').length);
  setTabCount('tabCountApproved', (stats.approvedCount || 0));
  setTabCount('tabCountRejected', (stats.rejectedCount || loans.filter(l => l.status === 'REJECTED').length));
  setTabCount('tabCountDisbursed', (stats.disbursedCount || 0));

  // Pulse the stat card if there are items needing Checker action
  const awaitingCard = document.getElementById('statAwaitingCard');
  if (awaitingCard) {
    if (pendingCount > 0 && (getRole() === 'CHECKER' || !getRole())) {
      awaitingCard.style.border = '1px solid rgba(234, 179, 8, 0.5)';
      awaitingCard.style.boxShadow = '0 0 12px rgba(234, 179, 8, 0.15)';
    } else {
      awaitingCard.style.border = '';
      awaitingCard.style.boxShadow = '';
    }
  }

  const approvedTotal = (parseInt(stats.approvedCount || 0, 10)) + (parseInt(stats.disbursedCount || 0, 10));
  document.getElementById('statApprovedApps').textContent = approvedTotal;
}

// Display all loans in a table with:
// 1. Loan Reference
// 2. Customer ID and Name
// 3. Loan Type
// 4. Loan Amount
// 5. Created By
// 6. Status
// 7. Action
function renderTable(loans) {
  const tbody = document.getElementById('applicationsTableBody');
  tbody.innerHTML = '';
  const role = getRole();
  const currentUser = getCurrentUser();

  if (loans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 48px;">
          No loan applications found matching your criteria.
        </td>
      </tr>
    `;
    return;
  }

  loans.forEach(loan => {
    const tr = document.createElement('tr');
    const isPendingCheckerAction = loan.status === 'PENDING_APPROVAL' || loan.status === 'AWAITING_APPROVAL';

    // Highlight rows needing Checker action
    if (isPendingCheckerAction) {
      tr.style.borderLeft = '3px solid rgba(234, 179, 8, 0.6)';
      tr.style.background = 'rgba(234, 179, 8, 0.04)';
    }

    // Check if the current logged-in user originated/made this loan
    const isOwnLoan = currentUser && (
      (loan.created_by_id && currentUser.id === loan.created_by_id) ||
      (loan.created_by_email && currentUser.email && currentUser.email.toLowerCase() === loan.created_by_email.toLowerCase()) ||
      (loan.submitted_by && currentUser.name && loan.submitted_by.toLowerCase().includes(currentUser.name.toLowerCase()))
    );

    // Role-tailored action button
    let actionBtnHtml = '';
    if (role === 'CHECKER') {
      if (loan.status === 'PENDING_APPROVAL' || loan.status === 'AWAITING_APPROVAL') {
        actionBtnHtml = `
          <button class="btn btn-emerald btn-sm" onclick="openReviewModal(${loan.id})" style="animation: pulseGlow 1.8s ease-in-out infinite; font-weight: 700; white-space: nowrap;">
            ⚡ Decide Now
          </button>
        `;
      } else {
        actionBtnHtml = `
          <button class="btn btn-secondary btn-sm" onclick="openReviewModal(${loan.id})" style="white-space: nowrap;">
            🔍 View / Audit
          </button>
        `;
      }
    } else if (role === 'MAKER') {
      if (loan.status === 'PENDING_APPROVAL') {
        actionBtnHtml = `
          <button class="btn btn-secondary btn-sm" onclick="openReviewModal(${loan.id})" style="border-color: #fde047; color: #fde047; white-space: nowrap;">
            ⏳ In Review
          </button>
        `;
      } else {
        actionBtnHtml = `
          <button class="btn btn-secondary btn-sm" onclick="openReviewModal(${loan.id})" style="border-color: #38bdf8; white-space: nowrap;">
            🛠️ View Proposal
          </button>
        `;
      }
    } else {
      actionBtnHtml = `
        <button class="btn btn-secondary btn-sm" onclick="openReviewModal(${loan.id})" style="white-space: nowrap;">
          🔍 Inspect
        </button>
      `;
    }

    const customerId = loan.customer_id || 'CUST-1001';
    const createdByName = loan.created_by_name || loan.submitted_by || 'Hemanth (Maker)';
    const createdByEmail = loan.created_by_email || 'hemanthmanih@gmail.com';

    tr.innerHTML = `
      <!-- 1. Loan Reference -->
      <td>
        <strong style="color: #fff; font-family: monospace; font-size: 0.95rem;">${loan.application_number}</strong>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">${new Date(loan.created_at).toLocaleDateString()}</div>
        ${isPendingCheckerAction ? '<div style="font-size: 0.68rem; color: #fde047; font-weight: 700; margin-top: 3px;">⏳ PENDING CHECKER</div>' : ''}
      </td>

      <!-- 2. Customer ID and Name -->
      <td>
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
          <span class="cust-id-badge">${customerId}</span>
          <strong style="color: #fff; font-size: 0.92rem;">${loan.applicant_name}</strong>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">
          📞 ${loan.phone} • ✉️ ${loan.email}
        </div>
      </td>

      <!-- 3. Loan Type -->
      <td>
        <span style="font-weight: 600; color: var(--primary-light); background: rgba(99, 102, 241, 0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.82rem; border: 1px solid rgba(99, 102, 241, 0.2);">
          ${loan.loan_type}
        </span>
      </td>

      <!-- 4. Loan Amount -->
      <td>
        <strong style="color: #fff; font-size: 1rem;">${formatCurrency(loan.loan_amount)}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
          ${loan.tenure_months}m @ ${loan.interest_rate}% (EMI: ${formatCurrency(loan.monthly_emi)})
        </div>
      </td>

      <!-- 5. Created By -->
      <td>
        <div style="font-weight: 600; color: #e2e8f0; font-size: 0.88rem;">
          ${createdByName}
          ${isOwnLoan ? '<span style="font-size: 0.7rem; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 3px; margin-left: 4px;">You</span>' : ''}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">${createdByEmail}</div>
      </td>

      <!-- 6. Status -->
      <td>
        <span class="status-pill status-${loan.status}">
          ${loan.status.replace(/_/g, ' ')}
        </span>
      </td>

      <!-- 7. Action -->
      <td>
        ${actionBtnHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openReviewModal(loanId) {
  const loan = allLoans.find(l => l.id === loanId);
  if (!loan) return;

  const user = getCurrentUser();
  const role = getRole();

  document.getElementById('modalLoanId').value = loan.id;
  document.getElementById('modalLoanTitle').textContent = `Proposal: ${loan.application_number} — ${loan.applicant_name}`;
  document.getElementById('officerNameInput').value = user ? `${user.name} (${role})` : 'Unassigned Officer';
  document.getElementById('officerNotesInput').value = loan.officer_notes || '';

  // Check Maker self-approval condition:
  // "A maker cannot approve their own loan."
  const isCreator = user && (
    (loan.created_by_id && user.id === loan.created_by_id) ||
    (loan.created_by_email && user.email && user.email.toLowerCase() === loan.created_by_email.toLowerCase()) ||
    (loan.submitted_by && user.name && loan.submitted_by.toLowerCase().includes(user.name.toLowerCase()))
  );

  const selfAlert = document.getElementById('selfApprovalAlert');
  if (selfAlert) {
    if (isCreator && role === 'MAKER') {
      selfAlert.style.display = 'block';
      selfAlert.innerHTML = `
        ⚠️ <strong>Four-Eyes Segregation:</strong> You originated this loan proposal as a Maker. A maker cannot approve their own loan; an independent Checker must authorize it.
      `;
    } else if (isCreator && role === 'CHECKER') {
      selfAlert.style.display = 'block';
      selfAlert.innerHTML = `
        ⚠️ <strong>Conflict of Interest (Four-Eyes Violation):</strong> You originally proposed this loan as Maker (${loan.created_by_name || 'Maker'}). Under banking segregation policies, a maker cannot approve their own loan. Another independent checker must review and approve this application.
      `;
    } else {
      selfAlert.style.display = 'none';
    }
  }

  // Render Role Guidance Alert & Dynamic Status Dropdown
  const guidance = document.getElementById('modalRoleGuidance');
  const statusSelect = document.getElementById('newStatusSelect');
  const saveBtn = document.getElementById('btnSaveStatus');
  const quickDecisionBox = document.getElementById('checkerQuickDecisionContainer');
  statusSelect.innerHTML = '';

  // Reset decision buttons style
  const btnApprove = document.getElementById('btnChoiceApprove');
  const btnReject = document.getElementById('btnChoiceReject');
  if (btnApprove) {
    btnApprove.classList.remove('selected');
    btnApprove.disabled = isCreator; // Cannot approve own loan!
  }
  if (btnReject) btnReject.classList.remove('selected');

  // Compute risk ratio for display
  const emiToIncomeRatio = loan.monthly_income > 0
    ? ((parseFloat(loan.monthly_emi || 0) + parseFloat(loan.existing_emis || 0)) / loan.monthly_income * 100).toFixed(1)
    : 'N/A';
  const riskColor = parseFloat(emiToIncomeRatio) > 50 ? '#fb7185' : parseFloat(emiToIncomeRatio) > 35 ? '#fbbf24' : '#34d399';

  if (role === 'MAKER') {
    if (quickDecisionBox) quickDecisionBox.style.display = 'none';
    guidance.style.background = 'rgba(6, 182, 212, 0.15)';
    guidance.style.color = '#38bdf8';
    guidance.innerHTML = `
      🛠️ <strong>MAKER Action Mode:</strong> Originate & appraise loan. <em>(Makers cannot approve loans — only Checkers can authorize sanction).</em>
    `;

    statusSelect.innerHTML = `
      <option value="PENDING_APPROVAL" ${loan.status === 'PENDING_APPROVAL' ? 'selected' : ''}>⏳ PENDING_APPROVAL — Forward for Checker Approval</option>
      <option value="UNDER_REVIEW" ${loan.status === 'UNDER_REVIEW' ? 'selected' : ''}>UNDER_REVIEW — Maker Appraisal In-Progress</option>
      <option value="DOCS_VERIFICATION" ${loan.status === 'DOCS_VERIFICATION' ? 'selected' : ''}>DOCS_VERIFICATION — KYC & Salary Slips Verified</option>
      <option value="AWAITING_APPROVAL" ${loan.status === 'AWAITING_APPROVAL' ? 'selected' : ''}>👉 AWAITING_APPROVAL — Escalate to Checker Queue</option>
    `;

    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Submit / Update Notes ➔';

  } else if (role === 'CHECKER') {
    if (quickDecisionBox) quickDecisionBox.style.display = 'block';
    guidance.style.background = 'rgba(16, 185, 129, 0.15)';
    guidance.style.color = '#34d399';
    guidance.innerHTML = `
      🛡️ <strong>CHECKER Authorization Mode (Four-Eyes Principle).</strong>
      Risk Ratio (EMI / Income): <strong style="color: ${riskColor}">${emiToIncomeRatio}%</strong>
      &nbsp;|&nbsp; CIBIL: <strong style="color: ${loan.credit_score >= 740 ? '#34d399' : '#fbbf24'}">${loan.credit_score}</strong>
      &nbsp;|&nbsp; Originator: <strong>${loan.created_by_name || loan.submitted_by || 'Maker'}</strong>
    `;

    let approveOptionHtml = `<option value="APPROVED" ${loan.status === 'APPROVED' ? 'selected' : ''}>✅ APPROVED — Authorize & Issue Sanction Letter</option>`;
    let disburseOptionHtml = `<option value="DISBURSED" ${loan.status === 'DISBURSED' ? 'selected' : ''}>💸 DISBURSED — Authorize Fund Release</option>`;

    // If maker cannot approve own loan:
    if (isCreator) {
      approveOptionHtml = `<option value="APPROVED" disabled>⛔ APPROVED (Disabled: Maker cannot approve own loan)</option>`;
      disburseOptionHtml = `<option value="DISBURSED" disabled>⛔ DISBURSED (Disabled: Maker cannot disburse own loan)</option>`;
    }

    statusSelect.innerHTML = `
      ${approveOptionHtml}
      <option value="REJECTED" ${loan.status === 'REJECTED' ? 'selected' : ''}>❌ REJECTED — Decline Proposal (Reason Required)</option>
      ${disburseOptionHtml}
      <option value="UNDER_REVIEW" ${loan.status === 'UNDER_REVIEW' ? 'selected' : ''}>↩️ UNDER_REVIEW — Return to Maker for Appraisal</option>
      <option value="PENDING_APPROVAL" ${loan.status === 'PENDING_APPROVAL' ? 'selected' : ''}>⏳ PENDING_APPROVAL — Keep In Checker Queue</option>
    `;

    if (loan.status === 'REJECTED') {
      statusSelect.value = 'REJECTED';
    } else if (loan.status === 'APPROVED' && !isCreator) {
      statusSelect.value = 'APPROVED';
    } else if (isCreator) {
      statusSelect.value = 'REJECTED';
    } else {
      statusSelect.value = 'APPROVED';
    }

    saveBtn.className = 'btn btn-emerald';
    saveBtn.textContent = '🛡️ Authorize Final Decision ➔';

  } else {
    if (quickDecisionBox) quickDecisionBox.style.display = 'none';
    guidance.style.background = 'rgba(245, 158, 11, 0.15)';
    guidance.style.color = '#fbbf24';
    guidance.innerHTML = `
      ⚠️ <strong>Viewing in Guest Mode:</strong> Sign in as MAKER or CHECKER to authorize actions.
    `;

    statusSelect.innerHTML = `
      <option value="${loan.status}">${loan.status}</option>
    `;
    saveBtn.textContent = 'Close';
    saveBtn.onclick = closeReviewModal;
  }

  // Risk & details panel
  const detailsContainer = document.getElementById('modalDetailsContent');
  detailsContainer.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
      <div>
        <strong>Customer ID & Applicant:</strong>
        <div><span class="cust-id-badge">${loan.customer_id || 'CUST-1001'}</span> <strong>${loan.applicant_name}</strong></div>
      </div>
      <div><strong>Contact:</strong> ${loan.phone} | ${loan.email}</div>
      <div><strong>PAN / ID:</strong> ${loan.pan_or_id || 'Not specified'}</div>
      <div><strong>Address:</strong> ${loan.address || ''} ${loan.city || ''} ${loan.state || ''}</div>
      <div><strong>Employment:</strong> ${loan.employment_type} (${loan.employer_name || 'N/A'})</div>
      <div><strong>Monthly Income:</strong> ${formatCurrency(loan.monthly_income)} <span style="font-size:0.8rem;color:var(--text-dim)">(Existing EMIs: ${formatCurrency(loan.existing_emis || 0)})</span></div>
      <div><strong>Loan Requested:</strong> <span style="color:#fff;font-weight:700;">${formatCurrency(loan.loan_amount)}</span> (${loan.tenure_months}m @ ${loan.interest_rate}%)</div>
      <div><strong>Monthly EMI:</strong> <span style="color:var(--accent-emerald);font-weight:700;">${formatCurrency(loan.monthly_emi)}/mo</span></div>
      <div style="grid-column: span 2; background: rgba(99, 102, 241, 0.08); padding: 8px 12px; border-radius: 6px;">
        <strong>Created / Originated By:</strong> <span style="color:#a5b4fc; font-weight:700;">${loan.created_by_name || loan.submitted_by || 'Hemanth (Maker)'}</span>
        <span style="font-size:0.8rem; color:var(--text-dim);">(${loan.created_by_email || 'hemanthmanih@gmail.com'})</span>
      </div>
      <div style="grid-column: span 2;"><strong>Maker Remarks / Purpose:</strong> <span style="color:#d1d5db;">${loan.loan_purpose || loan.officer_notes || 'N/A'}</span></div>
      <div style="grid-column: span 2; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
        <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-dim);">Prior Audit Trail:</span>
        <div style="color: #fff; margin-top: 2px;">${loan.officer_notes || 'No prior notes.'}</div>
      </div>
    </div>
  `;

  // Trigger modal state sync
  onModalStatusChange();
  document.getElementById('reviewModal').classList.add('active');
}

function selectDecision(decision) {
  const select = document.getElementById('newStatusSelect');
  const user = getCurrentUser();
  const loanId = parseInt(document.getElementById('modalLoanId').value, 10);
  const loan = allLoans.find(l => l.id === loanId);

  // Maker self-approval check
  const isCreator = loan && user && (
    (loan.created_by_id && user.id === loan.created_by_id) ||
    (loan.created_by_email && user.email && user.email.toLowerCase() === loan.created_by_email.toLowerCase()) ||
    (loan.submitted_by && user.name && loan.submitted_by.toLowerCase().includes(user.name.toLowerCase()))
  );

  if (decision === 'APPROVED' && isCreator) {
    showToast('Four-Eyes Violation: A maker cannot approve their own loan.', 'error');
    return;
  }

  select.value = decision;
  onModalStatusChange();

  if (decision === 'REJECTED') {
    const notesInput = document.getElementById('officerNotesInput');
    notesInput.focus();
    notesInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function onModalStatusChange() {
  const status = document.getElementById('newStatusSelect').value;
  const rejectionBox = document.getElementById('rejectionAlertBox');
  const notesInput = document.getElementById('officerNotesInput');
  const btnApprove = document.getElementById('btnChoiceApprove');
  const btnReject = document.getElementById('btnChoiceReject');
  const saveBtn = document.getElementById('btnSaveStatus');

  if (status === 'REJECTED') {
    if (rejectionBox) rejectionBox.style.display = 'flex';
    if (btnReject) btnReject.classList.add('selected');
    if (btnApprove) btnApprove.classList.remove('selected');
    notesInput.placeholder = 'MANDATORY REASON: Please provide clear reason for declining this loan proposal...';
    notesInput.style.borderColor = 'rgba(244, 63, 94, 0.7)';
    notesInput.style.background = 'rgba(244, 63, 94, 0.05)';
    saveBtn.className = 'btn btn-danger';
    saveBtn.textContent = '❌ Confirm Rejection with Reason ➔';
  } else if (status === 'APPROVED') {
    if (rejectionBox) rejectionBox.style.display = 'none';
    if (btnApprove) btnApprove.classList.add('selected');
    if (btnReject) btnReject.classList.remove('selected');
    notesInput.placeholder = 'Enter sanction terms, approved limit, or conditions for sanction letter...';
    notesInput.style.borderColor = 'rgba(16, 185, 129, 0.6)';
    notesInput.style.background = 'rgba(16, 185, 129, 0.04)';
    saveBtn.className = 'btn btn-emerald';
    saveBtn.textContent = '✅ Authorize Sanction & Approve ➔';
  } else {
    if (rejectionBox) rejectionBox.style.display = 'none';
    if (btnApprove) btnApprove.classList.remove('selected');
    if (btnReject) btnReject.classList.remove('selected');
    notesInput.placeholder = 'Enter appraisal notes or findings for the audit log...';
    notesInput.style.borderColor = '';
    notesInput.style.background = '';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Decision ➔';
  }
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('active');
}

async function submitStatusUpdate() {
  const role = getRole();
  if (!role) {
    showToast('Please sign in as MAKER or CHECKER to save decisions.', 'error');
    return;
  }

  const loanId = document.getElementById('modalLoanId').value;
  const status = document.getElementById('newStatusSelect').value;
  const notes = document.getElementById('officerNotesInput').value.trim();
  const officerName = document.getElementById('officerNameInput').value;
  const user = getCurrentUser();
  const loan = allLoans.find(l => l.id === parseInt(loanId, 10));

  // Rule: Maker cannot approve own loan
  const isCreator = loan && user && (
    (loan.created_by_id && user.id === loan.created_by_id) ||
    (loan.created_by_email && user.email && user.email.toLowerCase() === loan.created_by_email.toLowerCase()) ||
    (loan.submitted_by && user.name && loan.submitted_by.toLowerCase().includes(user.name.toLowerCase()))
  );

  if (isCreator && (status === 'APPROVED' || status === 'DISBURSED')) {
    showToast('Four-Eyes Principle: A maker cannot approve their own loan.', 'error');
    return;
  }

  // Rule: The checker must provide a reason when rejecting a loan
  if (status === 'REJECTED' && !notes) {
    showToast('A reason is required when rejecting a loan. Please provide the reason above.', 'error');
    document.getElementById('officerNotesInput').focus();
    return;
  }

  const btn = document.getElementById('btnSaveStatus');
  btn.disabled = true;
  btn.textContent = 'Saving Decision...';

  try {
    const res = await fetch(`/api/status/${loanId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes, reason: notes, officerName })
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message || `Application status updated to ${status}!`, 'success');
      closeReviewModal();
      loadApplications();
    } else {
      showToast(data.message || 'Action failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = role === 'CHECKER' ? '🛡️ Authorize Final Decision ➔' : 'Submit to Checker / Save Notes ➔';
  }
}

// Maker Customer Master Search Modal Methods
let modalCustDebounce = null;

function openCustomerSearchModal() {
  document.getElementById('customerSearchModal').classList.add('active');
  document.getElementById('modalCustSearchInput').value = '';
  searchModalCustomers();
}

function closeCustomerSearchModal() {
  document.getElementById('customerSearchModal').classList.remove('active');
}

function searchModalCustomers() {
  clearTimeout(modalCustDebounce);
  modalCustDebounce = setTimeout(async () => {
    const q = (document.getElementById('modalCustSearchInput').value || '').trim();
    const resultsContainer = document.getElementById('modalCustSearchResults');

    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        resultsContainer.innerHTML = json.data.map(c => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 12px;">
            <div>
              <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                <span style="background: rgba(6, 182, 212, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-family: monospace;">${c.customer_id}</span>
                ${c.name}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                📞 ${c.phone} • ✉️ ${c.email} • Income: ₹${c.monthly_income.toLocaleString('en-IN')}/mo • CIBIL: <strong style="color: #34d399;">${c.credit_score}</strong>
              </div>
            </div>
            <a href="apply.html?customerId=${encodeURIComponent(c.customer_id)}" class="btn btn-primary btn-sm" style="white-space: nowrap;">
              Originate Loan ➔
            </a>
          </div>
        `).join('');
      } else {
        resultsContainer.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--text-dim); font-size: 0.9rem;">
            No customers found matching "${q}".
          </div>
        `;
      }
    } catch (err) {
      resultsContainer.innerHTML = `<div style="color: #f43f5e; padding: 12px;">Error retrieving customers.</div>`;
    }
  }, 250);
}

