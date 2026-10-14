/**
 * ApexLoan Design System Controller
 * Pure Loan Management Dashboard with Stakent Ultra-Dark Glassmorphic Aesthetics
 */

// Application State
const loanState = {
  activeCategory: 'retail',
  activeSubTab: 'amortization',
  activeLoanId: 'home',
  tenureMonths: 36,
  loanAmount: 3845200,
  annualRate: 8.40
};

// Loan Products Data
const loanProducts = [
  {
    id: 'home',
    name: 'Home Loan (Mortgage)',
    category: 'Secured Housing • Up to 20 Yrs',
    iconClass: 'home',
    iconText: '🏡',
    label: 'Annual Interest Rate',
    rate: '8.40% p.a.',
    trend: 'Prime Rate',
    isUp: true,
    tooltipVal: 'Lowest APR',
    chartColor: '#10b981',
    principal: 4250000,
    annualRate: 8.40,
    dataPoints: [30, 36, 44, 52, 60, 68, 76, 84, 90, 96, 102, 110]
  },
  {
    id: 'personal',
    name: 'Personal Loan',
    category: 'Unsecured Facility • Fast Track',
    iconClass: 'personal',
    iconText: '💼',
    label: 'Annual Interest Rate',
    rate: '11.50% p.a.',
    trend: 'Instant Sanction',
    isUp: true,
    tooltipVal: 'Flexible Tenures',
    chartColor: '#7047eb',
    principal: 500000,
    annualRate: 11.50,
    dataPoints: [22, 28, 35, 42, 48, 55, 62, 70, 78, 85, 92, 98]
  },
  {
    id: 'auto',
    name: 'Auto / Vehicle Loan',
    category: 'Vehicle Financing • Fixed Rate',
    iconClass: 'auto',
    iconText: '🚗',
    label: 'Annual Interest Rate',
    rate: '9.25% p.a.',
    trend: 'Competitive',
    isUp: true,
    tooltipVal: 'Up to 7 Yrs',
    chartColor: '#3b82f6',
    principal: 820000,
    annualRate: 9.25,
    dataPoints: [25, 30, 38, 45, 50, 58, 64, 72, 79, 85, 88, 94]
  }
];

// Active Facility Showcase Details
const activeFacilities = {
  home: {
    name: 'Prime Home Loan (APX-HL-8821)',
    badgeIcon: '🏡',
    appId: 'APX-HL-8821',
    balanceLabel: 'Outstanding Principal Balance',
    balanceVal: '₹38,45,200',
    originalAmt: 4250000,
    rate: 8.40,
    emi: 42150,
    tenure: 36,
    status: 'Disbursed (MySQL Verified)',
    metrics: [
      { title: 'Monthly EMI Due', val: '₹42,150', time: '1st Nov', isUp: true },
      { title: 'Interest Saved (Prepaid)', val: '₹1,24,500', delta: '+14.2% ↗', time: 'YTD', isUp: true },
      { title: 'Loan-To-Value (LTV)', val: '64.2%', time: 'Safe', isUp: true },
      { 
        title: 'CIBIL Bureau Score',
        isBars: true,
        bars: [
          { label: 'Score: 785 (Excellent)', pct: 'Tier 1', width: '85%' },
          { label: 'On-Time Repayment Record', pct: '100%', width: '100%' }
        ]
      }
    ]
  },
  personal: {
    name: 'Instant Personal Loan (APX-PL-4920)',
    badgeIcon: '💼',
    appId: 'APX-PL-4920',
    balanceLabel: 'Outstanding Principal Balance',
    balanceVal: '₹4,12,500',
    originalAmt: 500000,
    rate: 11.50,
    emi: 16480,
    tenure: 36,
    status: 'Active (Standard)',
    metrics: [
      { title: 'Monthly EMI Due', val: '₹16,480', time: '5th Nov', isUp: true },
      { title: 'Principal Cleared', val: '₹87,500', delta: '+17.5%', time: 'YTD', isUp: true },
      { title: 'Debt-To-Income (DTI)', val: '28.4%', time: 'Healthy', isUp: true },
      { 
        title: 'CIBIL Bureau Score',
        isBars: true,
        bars: [
          { label: 'Score: 760 (Good)', pct: 'Tier 1', width: '76%' },
          { label: 'Zero Overdue Installments', pct: '100%', width: '100%' }
        ]
      }
    ]
  },
  auto: {
    name: 'Auto Loan Facility (APX-AL-3109)',
    badgeIcon: '🚗',
    appId: 'APX-AL-3109',
    balanceLabel: 'Outstanding Principal Balance',
    balanceVal: '₹6,40,000',
    originalAmt: 820000,
    rate: 9.25,
    emi: 17120,
    tenure: 48,
    status: 'Active (Vehicle Secured)',
    metrics: [
      { title: 'Monthly EMI Due', val: '₹17,120', time: '10th Nov', isUp: true },
      { title: 'Hypothecation Status', val: 'Registered', time: 'RTO Verified', isUp: true },
      { title: 'Insurance Validity', val: 'Comprehensive', time: 'Active', isUp: true },
      { 
        title: 'CIBIL Bureau Score',
        isBars: true,
        bars: [
          { label: 'Score: 775 (Very Good)', pct: 'Tier 1', width: '80%' },
          { label: 'Direct Debit Mandate Active', pct: '100%', width: '100%' }
        ]
      }
    ]
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initStakentCommon();
  if (document.getElementById('topCardsContainer')) {
    renderLoanDashboard();
    setupEventListeners();
    setupCanvasSparklines();
    renderTimelineTicks();
  }
});

// Common functionality across all Stakent pages
function initStakentCommon() {
  fetchLiveDbStats();

  // Mobile Menu Toggle
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('appSidebar');
  if (menuBtn && sidebar) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle('mobile-open');
    };
  }

  // Populate sidebar active list with real MySQL applications
  loadSidebarRecentLoans();

  // Sync Logged-In User Profile in Header
  try {
    const rawUser = localStorage.getItem('apex_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      const nameEl = document.getElementById('headerName');
      const roleEl = document.getElementById('headerRole');
      const avatarEl = document.getElementById('headerAvatar');
      const tagEl = document.getElementById('headerTag');
      if (nameEl) nameEl.textContent = u.name || 'Staff User';
      if (roleEl) roleEl.textContent = (u.role || 'MAKER').toUpperCase();
      if (tagEl) tagEl.textContent = '@' + (u.role || 'user').toLowerCase();
      if (avatarEl && u.name) {
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials || 'AU';
      }
    }
  } catch(e) {}
}

// Fetch live loan applications from MySQL for sidebar
async function loadSidebarRecentLoans() {
  const activeListEl = document.getElementById('sidebarActiveList');
  const countPill = document.getElementById('activeCountPill');
  if (!activeListEl) return;

  try {
    const res = await fetch('/api/all');
    const data = await res.json();
    if (data.success && data.data && data.data.length > 0) {
      if (countPill) countPill.textContent = data.data.length;
      activeListEl.innerHTML = data.data.slice(0, 8).map(loan => {
        const icon = loan.loan_type === 'Home Loan' ? '🏡' : loan.loan_type === 'Auto Loan' ? '🚗' : '💼';
        return `
          <div class="st-active-item" onclick="window.location.href='track.html?app=${encodeURIComponent(loan.application_number)}'" title="View Application ${loan.application_number}">
            <div class="st-asset-badge loan">${icon}</div>
            <div class="st-asset-details">
              <span class="st-asset-name">${loan.application_number}</span>
              <span class="st-asset-amount">${loan.applicant_name} • ₹${Number(loan.loan_amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      if (countPill) countPill.textContent = '0';
      activeListEl.innerHTML = `
        <div style="padding: 14px; font-size: 0.78rem; color: var(--st-text-muted); text-align: center;">
          No active proposals
        </div>
      `;
    }
  } catch (err) {
    if (countPill) countPill.textContent = '0';
  }
}

// Render dynamic elements
function renderLoanDashboard() {
  if (document.getElementById('brandTitle')) {
    document.getElementById('brandTitle').innerHTML = `ApexLoan <span class="st-brand-reg">®</span>`;
  }
  if (document.getElementById('brandSub')) {
    document.getElementById('brandSub').textContent = 'Intelligent Lending System';
  }
  if (document.getElementById('segBtn1')) document.getElementById('segBtn1').textContent = 'Retail Loans';
  if (document.getElementById('segBtn2')) document.getElementById('segBtn2').textContent = 'Commercial Facilities';

  // Section Header
  if (document.getElementById('pageHeading')) {
    document.getElementById('pageHeading').textContent = 'Lending Facilities & Schemes';
  }
  if (document.getElementById('recSubText')) {
    document.getElementById('recSubText').innerHTML = `Active lending rates & schemes 🕒 <span class="st-rec-count">3 Products</span>`;
  }

  // Render Top 3 Cards
  const cardsContainer = document.getElementById('topCardsContainer');
  if (cardsContainer) {
    cardsContainer.innerHTML = loanProducts.map((card, idx) => `
      <div class="st-card" data-loan-id="${card.id}" onclick="selectLoanCard('${card.id}')">
        <div class="st-card-header">
          <div class="st-asset-token-info">
            <div class="st-token-icon ${card.iconClass}">${card.iconText}</div>
            <div class="st-token-title-group">
              <span>${card.category}</span>
              <h4>${card.name} ↗</h4>
            </div>
          </div>
          <button class="st-arrow-btn" aria-label="Details">↗</button>
        </div>

        <div class="st-metric-label">${card.label}</div>
        <div class="st-metric-row">
          <span class="st-metric-val">${card.rate}</span>
          <span class="st-trend-pill ${card.isUp ? 'up' : 'down'}">
            ● ${card.trend}
          </span>
        </div>

        <div class="st-sparkline-box">
          <canvas id="sparklineCanvas_${idx}" class="st-sparkline-canvas"></canvas>
          <div class="st-chart-badge ${card.isUp ? 'pos' : 'neg'}" style="left: 75%; top: 25%;">
            ${card.tooltipVal}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render Right Featured Promo Card (Maker-Checker Banking Desk)
  const promoEl = document.getElementById('promoCardContainer');
  if (promoEl) {
    promoEl.innerHTML = `
      <div class="st-promo-card">
        <div>
          <div class="st-promo-top">
            <div class="st-promo-brand">
              <span>ApexLoan</span>
              <span style="font-size: 0.7rem; color: #a78bfa;">®</span>
            </div>
            <span class="st-promo-tag">Four-Eyes Banking</span>
          </div>
          <h3 class="st-promo-heading">Dual Authorization Desk</h3>
          <p class="st-promo-desc">
            Next-gen loan management with strict Maker-Checker segregation. Originate proposals, verify KYC, and authorize credit sanctions with complete audit logs.
          </p>
        </div>

        <div class="st-promo-actions">
          <button class="st-btn-connect-wallet" onclick="window.location.href='maker.html'">
            <span>Originate Loan (Maker)</span>
            <span>🛠️</span>
          </button>
          <button class="st-btn-enter-address" onclick="window.location.href='checker.html'">
            <span>Sanction Queue (Checker)</span>
            <span>🛡️</span>
          </button>
        </div>
      </div>
    `;
  }

  // Render Bottom Section Title
  if (document.getElementById('bottomSectionTitle')) {
    document.getElementById('bottomSectionTitle').textContent = 'Active Loan Portfolio Showcase';
  }
  updateActiveFacilityView();

  // Draw sparkline curves
  setTimeout(setupCanvasSparklines, 50);
}

// Update Active Facility Hero Card
function updateActiveFacilityView() {
  const fac = activeFacilities[loanState.activeLoanId] || activeFacilities.home;
  if (document.getElementById('showcaseLastUpdate')) {
    document.getElementById('showcaseLastUpdate').textContent = `Synced with MySQL Database 🕒`;
  }
  if (document.getElementById('showcaseAssetTitle')) {
    document.getElementById('showcaseAssetTitle').innerHTML = `
      ${fac.name} 
      <span class="st-title-badges">
        <button class="st-mini-icon-btn" title="Copy Loan ID" onclick="copyLoanId('${fac.appId}')">🔗</button>
        <button class="st-mini-icon-btn" title="Share Status" onclick="showToast('Loan status link copied!')">↗</button>
        <a href="track.html?app=${fac.appId}" class="st-profile-pill">Track Status ↗</a>
      </span>
    `;
  }
  if (document.getElementById('showcaseBalanceSub')) {
    document.getElementById('showcaseBalanceSub').textContent = fac.balanceLabel;
  }
  if (document.getElementById('showcaseBalanceVal')) {
    document.getElementById('showcaseBalanceVal').textContent = fac.balanceVal;
  }
  if (document.getElementById('btnShowcaseAction1')) {
    document.getElementById('btnShowcaseAction1').textContent = 'Prepay Principal';
  }
  if (document.getElementById('btnShowcaseAction2')) {
    document.getElementById('btnShowcaseAction2').textContent = 'Sanction Letter';
  }

  if (document.getElementById('periodWidgetTitle')) {
    document.getElementById('periodWidgetTitle').textContent = 'Repayment Schedule';
  }
  if (document.getElementById('periodWidgetSub')) {
    document.getElementById('periodWidgetSub').textContent = 'Remaining Tenure (Months)';
  }
  if (document.getElementById('periodEndBadge')) {
    document.getElementById('periodEndBadge').textContent = '60 Month';
  }

  renderBottomMetricCards(fac.metrics);
}

// Render the 4 metric cards below active showcase
function renderBottomMetricCards(metrics) {
  const grid = document.getElementById('bottomMetricsGrid');

  grid.innerHTML = metrics.map(m => {
    if (m.isBars) {
      return `
        <div class="st-metric-card">
          <div class="st-metric-card-header">
            <span class="st-metric-card-title">${m.title}</span>
          </div>
          <div class="st-bars-container">
            ${m.bars.map(b => `
              <div>
                <div class="st-bar-row">
                  <span>${b.label}</span>
                  <span style="font-weight: 700; color: #fff;">${b.pct}</span>
                </div>
                <div class="st-progress-track">
                  <div class="st-progress-fill" style="width: ${b.width};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="st-metric-card">
        <div class="st-metric-card-header">
          <span class="st-metric-card-title">${m.title}</span>
          <span class="st-metric-time-badge">${m.time}</span>
        </div>
        <div class="st-metric-card-val">
          <span>${m.val}</span>
          ${m.delta ? `<span class="st-delta-tag pos">${m.delta}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Canvas Sparkline Bezier Graph Rendering
function setupCanvasSparklines() {
  const activeList = loanProducts;
  activeList.forEach((card, idx) => {
    const canvas = document.getElementById(`sparklineCanvas_${idx}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pts = card.dataPoints;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = (max - min) || 1;

    const coords = pts.map((val, i) => {
      const x = (i / (pts.length - 1)) * (w - 10) + 5;
      const y = h - 10 - ((val - min) / range) * (h - 24);
      return { x, y };
    });

    ctx.clearRect(0, 0, w, h);

    // Gradient fill under the spline
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${card.chartColor}55`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Spline curve path
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);

    for (let i = 0; i < coords.length - 1; i++) {
      const xc = (coords[i].x + coords[i + 1].x) / 2;
      const yc = (coords[i].y + coords[i + 1].y) / 2;
      ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);

    // Area fill
    ctx.save();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Spline line stroke
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 0; i < coords.length - 1; i++) {
      const xc = (coords[i].x + coords[i + 1].x) / 2;
      const yc = (coords[i].y + coords[i + 1].y) / 2;
      ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);

    ctx.strokeStyle = card.chartColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glowing point marker at apex
    const apexPoint = coords[Math.floor(coords.length * 0.75)];
    ctx.beginPath();
    ctx.arc(apexPoint.x, apexPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = card.chartColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// Timeline Scrubber Equalizer Wave Rendering
function renderTimelineTicks() {
  const container = document.getElementById('waveTicksContainer');
  if (!container) return;

  const totalTicks = 42;
  const currentMonth = loanState.tenureMonths;
  const maxMonths = 60;
  const activeRatio = Math.min(Math.max(currentMonth / maxMonths, 0.1), 0.95);
  const activeCount = Math.floor(totalTicks * activeRatio);

  let html = '';
  for (let i = 0; i < totalTicks; i++) {
    const isActive = i <= activeCount;
    const h = 8 + Math.sin(i * 0.35) * 8 + (i % 3 === 0 ? 6 : 0);
    html += `<div class="st-tick ${isActive ? 'active' : ''}" style="height: ${h}px;"></div>`;
  }

  container.innerHTML = html;

  // Position scrubber bubble
  const handle = document.getElementById('scrubberHandle');
  if (handle) {
    const pct = activeRatio * 100;
    handle.style.left = `${pct}%`;
    handle.innerHTML = `<span>${currentMonth} Month</span> <span style="font-size: 0.65rem;">⏸</span>`;
  }
}

// Scrubber Click & Drag interaction
function onScrubberClick(e) {
  const container = document.getElementById('timelineScrubber');
  const rect = container.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0.1, Math.min(clickX / rect.width, 0.95));

  loanState.tenureMonths = Math.max(6, Math.round(pct * 60));
  renderTimelineTicks();

  // Dynamic EMI Calculation
  const P = 3845200;
  const R = 8.40;
  const N = loanState.tenureMonths;
  const monthlyRate = (R / 12) / 100;
  const factor = Math.pow(1 + monthlyRate, N);
  const emi = Math.round((P * monthlyRate * factor) / (factor - 1));

  showToast(`Tenure adjusted to ${N} Months (Projected EMI: ₹${emi.toLocaleString('en-IN')}/mo)`);
}

// Setup Event Listeners
function setupEventListeners() {
  // Segment Switcher (Retail Loans | Commercial Facilities)
  const seg1 = document.getElementById('segBtn1');
  const seg2 = document.getElementById('segBtn2');
  if (seg1 && seg2) {
    seg1.addEventListener('click', () => {
      seg1.classList.add('active');
      seg2.classList.remove('active');
      loanState.activeCategory = 'retail';
      renderLoanDashboard();
      showToast('Switched to Retail Loans View');
    });
    seg2.addEventListener('click', () => {
      seg2.classList.add('active');
      seg1.classList.remove('active');
      loanState.activeCategory = 'commercial';
      renderLoanDashboard();
      showToast('Switched to Commercial Lending Facilities');
    });
  }

  // Timeline Scrubber click
  const scrubber = document.getElementById('timelineScrubber');
  if (scrubber) {
    scrubber.addEventListener('click', onScrubberClick);
  }

  // Sub-tabs (Amortization, Statement, Credit Health, Tax Benefits)
  document.querySelectorAll('.st-subtab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.st-subtab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      loanState.activeSubTab = tabName;
      onSubTabChange(tabName);
    });
  });

  // Mobile Menu Toggle
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('appSidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Window resize re-draws sparklines
  window.addEventListener('resize', () => {
    setupCanvasSparklines();
  });
}

// Select active loan facility
function selectLoanFacility(facilityId) {
  if (!activeFacilities[facilityId]) return;
  loanState.activeLoanId = facilityId;
  updateActiveFacilityView();
  renderTimelineTicks();

  document.querySelectorAll('.st-active-item').forEach(el => el.classList.remove('active-asset'));
  event?.currentTarget?.classList?.add('active-asset');
  showToast(`Viewing active facility: ${activeFacilities[facilityId].name}`);
}

function selectLoanCard(loanId) {
  selectLoanFacility(loanId);
}

// Showcase Action Buttons
function handleShowcaseAction1() {
  showToast('Opening Prepayment & Partial EMI Clearance gateway...');
  openModal('repayModal');
}

function handleShowcaseAction2() {
  showToast('Generating official PDF Sanction Letter from MySQL records...');
  window.open('track.html?app=APX-HL-8821', '_blank');
}

// Sub-tab navigation click
function onSubTabChange(tab) {
  if (tab === 'amortization') {
    showToast('Amortization: 78% Principal, 22% Interest split this fiscal year.');
  } else if (tab === 'statement') {
    showToast('Statement: 36 of 60 installments cleared with zero defaults.');
  } else if (tab === 'risk') {
    showToast('Credit Health: CIBIL Score 785 (Excellent / Low Default Probability).');
  } else if (tab === 'reward') {
    showToast('Tax Benefits: ₹2,00,000 under Sec 24(b) + ₹1,50,000 under Sec 80C.');
  }
}

// Modals
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Toast alerts
function showToast(msg) {
  const toast = document.getElementById('stakentToast');
  if (!toast) return;

  toast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
  toast.classList.add('show');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function copyLoanId(id) {
  navigator.clipboard?.writeText(id);
  showToast(`Loan Application ID ${id} copied to clipboard!`);
}

// Check real MySQL database status
async function fetchLiveDbStats() {
  try {
    const res = await fetch('/api/health');
    const json = await res.json();
    if (json.success && json.mysql?.connected) {
      const badge = document.getElementById('dbLivePill');
      if (badge) {
        badge.innerHTML = '<span style="color: #10b981;">●</span> MySQL Connected (loan_db)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
    }
  } catch (e) {
    // Graceful fallback
  }
}
