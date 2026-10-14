let trackPollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('query');
  if (q) {
    document.getElementById('searchQuery').value = q;
    executeSearch();
  }
});

function setQuery(val) {
  document.getElementById('searchQuery').value = val;
  executeSearch();
}

async function executeSearch(isSilent = false) {
  const query = document.getElementById('searchQuery').value.trim();
  if (!query) return;

  const btn = document.getElementById('btnTrackSearch');
  if (!isSilent) {
    btn.disabled = true;
    btn.textContent = 'Searching...';
  }

  try {
    const res = await fetch(`/api/track?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.success) {
      renderTrackResult(data.data.application, data.data.history);
      document.getElementById('resultsWrapper').style.display = 'block';

      // Start auto-refreshing tracking status every 4 seconds in real time
      if (!trackPollingInterval) {
        trackPollingInterval = setInterval(() => {
          if (!document.hidden) {
            executeSearch(true);
          }
        }, 4000);
      }
    } else {
      if (!isSilent) {
        document.getElementById('resultsWrapper').style.display = 'none';
        showToast(data.message || 'No records found.', 'error');
      }
    }
  } catch (err) {
    if (!isSilent) {
      showToast('Failed to connect to server. Ensure Node.js server is running.', 'error');
    }
  } finally {
    if (!isSilent) {
      btn.disabled = false;
      btn.textContent = '🔍 Track Status';
    }
  }
}

function renderTrackResult(app, history) {
  document.getElementById('resAppNum').textContent = app.application_number;
  document.getElementById('resSubmittedDate').textContent = `Submitted on: ${new Date(app.created_at).toLocaleString()}`;
  
  // Status Badge
  const badge = document.getElementById('resStatusBadge');
  badge.className = `status-pill status-${app.status}`;
  badge.textContent = app.status.replace('_', ' ');

  // Milestone Stepper
  updateMilestoneStepper(app.status);

  // Financial info
  document.getElementById('resApplicantName').textContent = app.applicant_name;
  document.getElementById('resContactInfo').textContent = `${app.phone} • ${app.email}`;

  document.getElementById('resLoanType').textContent = app.loan_type;
  document.getElementById('resPurpose').textContent = app.loan_purpose || 'Standard personal use';

  document.getElementById('resLoanAmount').textContent = formatCurrency(app.loan_amount);
  document.getElementById('resRateTenure').textContent = `${app.interest_rate}% p.a. • ${app.tenure_months} Months`;

  document.getElementById('resMonthlyEmi').textContent = formatCurrency(app.monthly_emi);
  const totalPayable = app.monthly_emi * app.tenure_months;
  document.getElementById('resTotalPayable').textContent = `Total: ${formatCurrency(totalPayable)}`;

  // Notes
  document.getElementById('resOfficerNotes').textContent = app.officer_notes || 'No underwriter notes logged yet.';

  // Timeline
  const timeline = document.getElementById('resTimeline');
  timeline.innerHTML = '';

  if (history && history.length > 0) {
    history.forEach((h, index) => {
      const isLast = index === history.length - 1;
      const item = document.createElement('div');
      item.className = `timeline-item ${isLast ? 'active' : ''}`;
      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
          <span class="timeline-title">${h.status.replace('_', ' ')} (${h.changed_by || 'System'})</span>
          <span class="timeline-time">${new Date(h.created_at).toLocaleString()}</span>
        </div>
        <div class="timeline-comment">${h.comment || 'Status transitioned.'}</div>
      `;
      timeline.appendChild(item);
    });
  } else {
    timeline.innerHTML = '<div style="font-size: 0.88rem; color: var(--text-dim);">No history events logged.</div>';
  }
}

function updateMilestoneStepper(status) {
  const steps = [
    document.getElementById('mStep1'), // Submitted
    document.getElementById('mStep2'), // Under Review
    document.getElementById('mStep3'), // Document KYC
    document.getElementById('mStep4'), // Underwriting
    document.getElementById('mStep5'), // Approval
    document.getElementById('mStep6'), // Disbursement
  ];

  // Reset
  steps.forEach(s => s.className = 'track-step');

  const statusMap = {
    'SUBMITTED': 1,
    'UNDER_REVIEW': 2,
    'DOCS_VERIFICATION': 3,
    'APPROVED': 5,
    'DISBURSED': 6,
    'REJECTED': 2,
  };

  const currentLevel = statusMap[status] || 1;

  steps.forEach((stepEl, idx) => {
    const stepNumber = idx + 1;
    if (stepNumber < currentLevel) {
      stepEl.className = 'track-step done';
    } else if (stepNumber === currentLevel) {
      stepEl.className = 'track-step current';
    }
  });

  if (status === 'REJECTED') {
    const m5 = document.getElementById('mStep5');
    if (m5) {
      m5.querySelector('.track-step-text').textContent = 'Application Rejected';
      m5.querySelector('.track-step-circle').style.background = '#f43f5e';
      m5.querySelector('.track-step-circle').style.borderColor = '#f43f5e';
    }
  }
}
