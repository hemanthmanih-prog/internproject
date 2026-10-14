// LendSphere / ApexLoan Global JavaScript Helper

// Format currency in Indian numbering (INR / ₹)
function formatCurrency(amount) {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Show Toast notification
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// JWT Token & Auth Helpers
function getAuthToken() {
  return localStorage.getItem('apex_jwt_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('apex_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function logout() {
  localStorage.removeItem('apex_jwt_token');
  localStorage.removeItem('apex_user');
  sessionStorage.removeItem('auth_error_message');
  showToast('Signed out successfully.', 'info');
  setTimeout(() => {
    window.location.replace('auth.html');
  }, 400);
}

// Strict Client-Side Role & Authentication Enforcer
function enforceRoleAuth(allowedRoles = []) {
  const token = getAuthToken();
  const user = getCurrentUser();

  // 1. Strict guard: No unauthenticated access
  if (!token || !user) {
    sessionStorage.setItem('auth_error_message', '🔒 Access Restricted: Please sign in with your Maker or Checker credentials.');
    sessionStorage.setItem('auth_target_url', window.location.pathname);
    window.location.replace('auth.html');
    return false;
  }

  const role = (user.role || '').toUpperCase();

  // 2. Strict guard: Role-based segregation
  if (allowedRoles && allowedRoles.length > 0) {
    const uppercaseAllowed = allowedRoles.map(r => r.toUpperCase());
    const isAllowed = uppercaseAllowed.includes('ALL') || uppercaseAllowed.includes(role) || role === 'ADMIN';
    if (!isAllowed) {
      const currentPath = window.location.pathname.toLowerCase();
      if (role === 'MAKER' && !currentPath.includes('maker.html')) {
        sessionStorage.setItem('auth_error_message', '⛔ Access Denied: You are signed in as a Maker. The Checker Authorization Desk is restricted.');
        window.location.replace('maker.html');
      } else if ((role === 'CHECKER' || role === 'OFFICER') && !currentPath.includes('checker.html')) {
        sessionStorage.setItem('auth_error_message', '⛔ Access Denied: You are signed in as a Checker. Loan origination is restricted to Makers.');
        window.location.replace('checker.html');
      } else if (!currentPath.includes('auth.html')) {
        sessionStorage.setItem('auth_error_message', '⛔ Access Denied: You do not have permission to view this portal.');
        window.location.replace('auth.html');
      }
      return false;
    }
  }

  return true;
}

// Universal Role-Aware Sidebar and Header Navigation Renderer
function renderRoleBasedSidebar() {
  const user = getCurrentUser();
  const currentPath = window.location.pathname.toLowerCase();

  // Check and display stored auth alert if any
  const storedMsg = sessionStorage.getItem('auth_error_message');
  if (storedMsg) {
    sessionStorage.removeItem('auth_error_message');
    setTimeout(() => {
      showToast(storedMsg, 'error');
    }, 350);
  }

  // Update Top Header Profile Chip
  const headerName = document.getElementById('headerName');
  const headerRole = document.getElementById('headerRole');
  const headerTag = document.getElementById('headerTag');
  const headerAvatar = document.getElementById('headerAvatar');
  const userProfileChip = document.getElementById('userProfileChip');

  if (user) {
    const roleUpper = (user.role || 'GUEST').toUpperCase();
    if (headerName) headerName.textContent = user.name || (roleUpper === 'MAKER' ? 'David Miller' : 'Victoria Vance');
    if (headerRole) {
      headerRole.textContent = roleUpper;
      if (roleUpper === 'MAKER') {
        headerRole.style.background = 'rgba(6, 182, 212, 0.2)';
        headerRole.style.color = '#38bdf8';
      } else if (roleUpper === 'CHECKER') {
        headerRole.style.background = 'rgba(16, 185, 129, 0.2)';
        headerRole.style.color = '#34d399';
      }
    }
    if (headerTag) headerTag.textContent = `@${(user.role || 'user').toLowerCase()}`;
    if (headerAvatar) {
      const initials = (user.name || (roleUpper === 'MAKER' ? 'DM' : 'VV')).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      headerAvatar.textContent = initials;
      if (roleUpper === 'MAKER') {
        headerAvatar.style.background = 'linear-gradient(135deg, #06b6d4, #3b82f6)';
      } else if (roleUpper === 'CHECKER') {
        headerAvatar.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
      }
    }

    if (userProfileChip) {
      userProfileChip.title = `Signed in as ${user.name} (${user.role}) — Click to Sign Out`;
      userProfileChip.onclick = () => {
        if (confirm(`Sign out of ${user.name} (${user.role})?`)) {
          logout();
        }
      };
    }
  }

  // Hide Forbidden Header Action Buttons based on Role
  if (user) {
    const roleUpper = (user.role || '').toUpperCase();
    
    // Checkers must NOT see "Apply for Loan" or "Maker Desk" in header
    if (roleUpper === 'CHECKER') {
      document.querySelectorAll('.st-btn-deposit').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('apply') || text.includes('maker')) {
          btn.style.display = 'none';
        }
      });
      // Header links pointing to maker or apply
      document.querySelectorAll('a[href*="maker.html"], a[href*="apply.html"]').forEach(a => {
        if (!a.classList.contains('sidebar-allow')) {
          a.style.display = 'none';
        }
      });
    }

    // Makers must NOT see "Checker Portal" in header
    if (roleUpper === 'MAKER') {
      document.querySelectorAll('.st-btn-deposit').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('checker')) {
          btn.style.display = 'none';
        }
      });
      // Header links pointing to checker
      document.querySelectorAll('a[href*="checker.html"]').forEach(a => {
        if (!a.classList.contains('sidebar-allow')) {
          a.style.display = 'none';
        }
      });
    }
  }

  // Update Left Sidebar Nav Menu (`.st-nav-menu`)
  const navMenus = document.querySelectorAll('.st-nav-menu');
  if (!navMenus || navMenus.length === 0) return;

  const role = user ? (user.role || '').toUpperCase() : '';

  navMenus.forEach(navMenu => {
    let itemsHtml = '';

    if (role === 'MAKER') {
      // MAKER ONLY NAVIGATION:
      itemsHtml = `
        <a href="maker.html" class="st-nav-item ${currentPath.includes('maker.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Maker Console</span>
          <span class="st-beta-badge" style="background: rgba(6, 182, 212, 0.2); color: #38bdf8; border-color: rgba(6, 182, 212, 0.4);">Maker</span>
        </a>

        <a href="apply.html" class="st-nav-item ${currentPath.includes('apply.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <span>Apply for Loan</span>
        </a>

        <a href="track.html" class="st-nav-item ${currentPath.includes('track.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Track Status</span>
        </a>

        <a href="javascript:void(0)" onclick="logout()" class="st-nav-item" style="color: #fb7185; margin-top: 14px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </a>
      `;
    } else if (role === 'CHECKER' || role === 'OFFICER') {
      // CHECKER ONLY NAVIGATION:
      itemsHtml = `
        <a href="checker.html" class="st-nav-item ${currentPath.includes('checker.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <span>Checker Desk</span>
          <span class="st-beta-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.4);">Checker</span>
        </a>

        <a href="track.html" class="st-nav-item ${currentPath.includes('track.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Track Status</span>
        </a>

        <a href="javascript:void(0)" onclick="logout()" class="st-nav-item" style="color: #fb7185; margin-top: 14px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </a>
      `;
    } else if (role === 'ADMIN') {
      // ADMIN ACCESS
      itemsHtml = `
        <a href="maker.html" class="st-nav-item ${currentPath.includes('maker.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span>Maker Console</span>
        </a>
        <a href="checker.html" class="st-nav-item ${currentPath.includes('checker.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          <span>Checker Approval</span>
        </a>
        <a href="admin.html" class="st-nav-item ${currentPath.includes('admin.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span>Admin Analytics</span>
        </a>
        <a href="track.html" class="st-nav-item ${currentPath.includes('track.html') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Track Status</span>
        </a>
        <a href="javascript:void(0)" onclick="logout()" class="st-nav-item" style="color: #fb7185;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span>Sign Out</span>
        </a>
      `;
    } else {
      // Unauthenticated / Auth page
      itemsHtml = `
        <a href="auth.html" class="st-nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <span>Staff Login</span>
        </a>
      `;
    }

    navMenu.innerHTML = itemsHtml;
  });

  // Update Sidebar Bottom Super Card
  const superCards = document.querySelectorAll('.st-super-card');
  superCards.forEach(card => {
    if (role === 'MAKER') {
      card.onclick = () => window.location.href = 'maker.html';
      card.innerHTML = `
        <div class="st-super-icon" style="background: rgba(6, 182, 212, 0.2); color: #38bdf8;">🛠️</div>
        <div class="st-super-text">
          <h5>Maker Workspace</h5>
          <p>Origination & KYC Desk</p>
        </div>
      `;
    } else if (role === 'CHECKER' || role === 'OFFICER') {
      card.onclick = () => window.location.href = 'checker.html';
      card.innerHTML = `
        <div class="st-super-icon" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">🛡️</div>
        <div class="st-super-text">
          <h5>Checker Desk</h5>
          <p>Sanction & Approval Authority</p>
        </div>
      `;
    }
  });
}

// Render dynamic User profile badge in nav (legacy navbar fallback)
function renderNavUser() {
  const user = getCurrentUser();
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const existingAuthBtn = document.getElementById('navAuthControl');
  if (existingAuthBtn) existingAuthBtn.remove();

  const authWrapper = document.createElement('div');
  authWrapper.id = 'navAuthControl';
  authWrapper.style.display = 'flex';
  authWrapper.style.alignItems = 'center';
  authWrapper.style.gap = '8px';

  if (user) {
    const isOfficer = user.role === 'officer' || user.role === 'admin' || user.role === 'CHECKER';
    authWrapper.innerHTML = `
      <div style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle); padding: 5px 12px; border-radius: var(--radius-full); font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
        <span>${isOfficer ? '🛡️' : '👤'}</span>
        <strong style="color: #fff;">${user.name}</strong>
        <span style="color: var(--primary-light); font-size: 0.75rem; text-transform: uppercase;">(${user.role})</span>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="logout()" title="Sign Out">Sign Out</button>
    `;
  } else {
    authWrapper.innerHTML = `
      <a href="auth.html" class="btn btn-secondary btn-sm">🔑 Sign In (JWT)</a>
    `;
  }

  navActions.appendChild(authWrapper);
}

// Check MySQL Connection Health and update UI badge
async function checkMySQLConnection() {
  const badge = document.getElementById('dbStatusBadge');
  const alertBanner = document.getElementById('dbAlertBanner');
  const sidebarDbBadge = document.getElementById('sidebarDbStatusBadge');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.success && data.mysql.connected) {
      if (badge) {
        badge.innerHTML = `<span class="status-dot connected"></span> MySQL Online (${data.mysql.dbName})`;
        badge.title = `Connected to MySQL: ${data.mysql.user}@${data.mysql.host}:${data.mysql.port}/${data.mysql.dbName}`;
      }
      if (sidebarDbBadge) {
        sidebarDbBadge.innerHTML = `<span class="status-dot connected"></span> MySQL Online (${data.mysql.dbName})`;
      }
      if (alertBanner) {
        alertBanner.style.display = 'none';
      }
    } else {
      if (badge) {
        badge.innerHTML = `<span class="status-dot connected"></span> Active (${data.mysql.activeMode || 'Local Engine'})`;
        badge.title = `Database active. To save directly to MySQL, configure DB_PASSWORD in .env`;
      }
      if (sidebarDbBadge) {
        sidebarDbBadge.innerHTML = `<span class="status-dot connected"></span> Active (${data.mysql.activeMode || 'Local'})`;
      }
      if (alertBanner) {
        alertBanner.style.display = 'flex';
        alertBanner.innerHTML = `
          <span>ℹ️ <strong>System Note:</strong> Operating with JWT Authentication. To persist in MySQL, verify <code>DB_PASSWORD</code> in your <code>.env</code> file.</span>
        `;
      }
    }
  } catch (err) {
    if (badge) {
      badge.innerHTML = `<span class="status-dot disconnected"></span> Server Offline`;
    }
    if (sidebarDbBadge) {
      sidebarDbBadge.innerHTML = `<span class="status-dot disconnected"></span> Server Offline`;
    }
  }
}

// Left-Side Navigation Sidebar Component
function initLeftSidebar() {
  if (document.getElementById('apexSidebar') || document.getElementById('appSidebar')) return;

  const currentPath = window.location.pathname.toLowerCase();
  const isHome = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '';
  const isApply = currentPath.includes('apply.html');
  const isTrack = currentPath.includes('track.html');
  const isAdmin = currentPath.includes('admin.html');
  const isAuth = currentPath.includes('auth.html');

  const user = getCurrentUser();

  // 1. Insert Hamburger toggle button into header nav if not present
  const navContainer = document.querySelector('.nav-container');
  if (navContainer && !document.getElementById('sidebarToggleBtn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggleBtn';
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle Navigation Menu');
    toggleBtn.title = 'Open Left Navigation (Ctrl+B)';
    toggleBtn.innerHTML = `
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    `;
    navContainer.insertBefore(toggleBtn, navContainer.firstChild);
  }

  // 2. Create Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'sidebarBackdrop';
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  // 3. Create Sidebar Drawer
  const sidebar = document.createElement('aside');
  sidebar.id = 'apexSidebar';
  sidebar.className = 'apex-sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a href="index.html" class="brand-logo" style="text-decoration: none;">
        <div class="brand-icon">⚡</div>
        <span>Apex<span class="brand-highlight">Loan</span></span>
      </a>
      <button class="sidebar-close-btn" id="sidebarCloseBtn" title="Close Sidebar (Esc)" aria-label="Close Sidebar">✕</button>
    </div>

    <div class="sidebar-content">
      <div>
        <div class="sidebar-section-title">MAIN MENU</div>
        <ul class="sidebar-menu" id="sidebarNavMenu">
          <li>
            <a href="index.html" class="sidebar-link ${isHome && !window.location.hash ? 'active' : ''}" onclick="closeSidebar()">
              <div class="sidebar-link-content">
                <span class="sidebar-link-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M10.4422 2.94168C11.4061 2.34887 12.6219 2.34887 13.5858 2.94168L17.9949 5.65457V4.01101C17.9949 3.45873 18.4426 3.01101 18.9949 3.01101C19.5472 3.01101 19.9949 3.45873 19.9949 4.01101V6.88504L22.8309 8.63015C23.3009 8.91954 23.447 9.53493 23.158 10.0052C22.8687 10.4754 22.2534 10.6224 21.783 10.3333L21.0193 9.86258V18.4964C21.0192 20.4292 19.4522 21.9963 17.5193 21.9964H6.5086C4.57571 21.9964 3.00877 20.4292 3.0086 18.4964V9.86355L2.24591 10.3333C1.77553 10.6227 1.15935 10.4755 0.869931 10.0052C0.581012 9.53497 0.727184 8.91957 1.19708 8.63015L10.4422 2.94168ZM12.5379 4.6448C12.2167 4.44744 11.8112 4.44744 11.49 4.6448L5.0047 8.63504C5.00675 8.66116 5.0086 8.68749 5.0086 8.71414V18.4964C5.00877 19.3247 5.68028 19.9964 6.5086 19.9964H7.98224V15.4817C7.98237 14.1011 9.10161 12.9817 10.4822 12.9817H13.5916C14.9718 12.9822 16.0915 14.1014 16.0916 15.4817V19.9964H17.5193C18.3476 19.9963 19.0192 19.3246 19.0193 18.4964V8.71414C19.0194 8.68752 19.0202 8.66113 19.0223 8.63504L12.5379 4.6448ZM10.4822 14.9817C10.2062 14.9817 9.98237 15.2057 9.98224 15.4817V19.9964H14.0916V15.4817C14.0915 15.206 13.8672 14.9822 13.5916 14.9817H10.4822Z"/>
                  </svg>
                </span>
                <span>Home</span>
              </div>
            </a>
          </li>
          <li>
            <a href="index.html#products" class="sidebar-link ${window.location.hash === '#products' ? 'active' : ''}" onclick="closeSidebar()">
              <div class="sidebar-link-content">
                <span class="sidebar-link-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M11.9992 1.32617C12.4653 1.32617 12.9238 1.43812 13.338 1.65137L21.1769 5.68848C21.4472 5.82748 21.6642 6.04308 21.8068 6.2998L21.8634 6.41211L21.9103 6.52832C22.0084 6.80286 22.0261 7.10022 21.963 7.38477C21.8908 7.71021 21.7141 8.01003 21.4503 8.22949C21.1859 8.44927 20.8506 8.57348 20.4992 8.57324L19.9542 8.57422V16.1855C21.143 16.5787 22.0011 17.698 22.0011 19.0186C22.0011 20.6668 20.665 22.0029 19.0167 22.0029H4.98353C3.3353 22.0029 1.99915 20.6668 1.99915 19.0186C1.99915 17.6976 2.85777 16.5785 4.04701 16.1855V8.57422H3.49915C3.14747 8.57412 2.8122 8.44875 2.54798 8.22852C2.28477 8.00885 2.10715 7.70901 2.03529 7.38379C1.96354 7.05881 1.9987 6.71631 2.13685 6.41113C2.2753 6.10563 2.51315 5.84717 2.82142 5.68848L10.6603 1.65137L10.8175 1.57617C11.189 1.41178 11.5913 1.32623 11.9992 1.32617ZM4.98353 18.0342C4.43987 18.0342 3.99915 18.4749 3.99915 19.0186C3.99915 19.5622 4.43987 20.0029 4.98353 20.0029H19.0167C19.5604 20.0029 20.0011 19.5622 20.0011 19.0186C20.0011 18.4749 19.5604 18.0342 19.0167 18.0342H4.98353ZM15.3185 16.0342H17.9542V8.57422H15.3185V16.0342ZM10.6827 16.0342H13.3185V8.57422H10.6827V16.0342ZM6.04701 16.0342H8.68275V8.57422H6.04701V16.0342ZM11.9992 3.32617C11.8549 3.32624 11.7101 3.3608 11.5763 3.42969L5.47083 6.57422H18.5294L12.422 3.42969C12.2881 3.36085 12.1435 3.32617 11.9992 3.32617Z"/>
                  </svg>
                </span>
                <span>Products</span>
              </div>
            </a>
          </li>
          <li>
            <a href="index.html#calculator" class="sidebar-link ${window.location.hash === '#calculator' ? 'active' : ''}" onclick="closeSidebar()">
              <div class="sidebar-link-content">
                <span class="sidebar-link-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.6625 8.5125C16.2125 8.5125 16.6625 8.0625 16.6625 7.5125C16.6625 6.9625 16.2125 6.5125 15.6625 6.5125H8.35C7.8 6.5125 7.35 6.9625 7.35 7.5125C7.35 8.0625 7.8 8.5125 8.35 8.5125H15.6625ZM15.9875 17.325C16.5375 17.325 16.9875 16.875 16.9875 16.325V12.0125C16.9875 11.4625 16.5375 11.0125 15.9875 11.0125C15.4375 11.0125 14.9875 11.4625 14.9875 12.0125V16.325C14.9875 16.875 15.4375 17.325 15.9875 17.325ZM7 22H17C19.35 22 21 20.35 21 18V6C21 3.65 19.35 2 17 2H7C4.65 2 3 3.65 3 6V18C3 20.35 4.65 22 7 22ZM5 6C5 4.825 5.825 4 7 4H17C18.175 4 19 4.825 19 6V18C19 19.175 18.175 20 17 20H7C5.825 20 5 19.175 5 18V6ZM9.575 12.2875C9.575 11.575 9 11 8.2875 11C7.575 11 7 11.575 7 12.2875C7 13 7.575 13.575 8.2875 13.575C9 13.575 9.575 13 9.575 12.2875ZM12 13.575C12.7125 13.575 13.2875 13 13.2875 12.2875C13.2875 11.575 12.7125 11 12 11C11.2875 11 10.7125 11.575 10.7125 12.2875C10.7125 13 11.2875 13.575 12 13.575ZM8.2875 17.325C9 17.325 9.575 16.75 9.575 16.0375C9.575 15.325 9 14.75 8.2875 14.75C7.575 14.75 7 15.325 7 16.0375C7 16.75 7.575 17.325 8.2875 17.325ZM12 17.325C12.7125 17.325 13.2875 16.75 13.2875 16.0375C13.2875 15.325 12.7125 14.75 12 14.75C11.2875 14.75 10.7125 15.325 10.7125 16.0375C10.7125 16.75 11.2875 17.325 12 17.325Z"/>
                  </svg>
                </span>
                <span>EMI Calculator</span>
              </div>
            </a>
          </li>
          <li>
            <a href="track.html" class="sidebar-link ${isTrack ? 'active' : ''}" onclick="closeSidebar()">
              <div class="sidebar-link-content">
                <span class="sidebar-link-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M10.875 4.5C7.35418 4.5 4.5 7.35418 4.5 10.875C4.5 14.3958 7.35418 17.25 10.875 17.25C14.3958 17.25 17.25 14.3958 17.25 10.875C17.25 7.35418 14.3958 4.5 10.875 4.5ZM2.5 10.875C2.5 6.24962 6.24962 2.5 10.875 2.5C15.5004 2.5 19.25 6.24962 19.25 10.875C19.25 12.8273 18.582 14.6236 17.462 16.0478L21.2071 19.7929C21.5976 20.1834 21.5976 20.8166 21.2071 21.2071C20.8166 21.5976 20.1834 21.5976 19.7929 21.2071L16.0478 17.462C14.6236 18.582 12.8273 19.25 10.875 19.25C6.24962 19.25 2.5 15.5004 2.5 10.875Z"/>
                  </svg>
                </span>
                <span>Track Application</span>
              </div>
            </a>
          </li>
          <li>
            <a href="admin.html" class="sidebar-link ${isAdmin ? 'active' : ''}" onclick="closeSidebar()">
              <div class="sidebar-link-content">
                <span class="sidebar-link-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4C10.3431 4 9 5.34315 9 7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7C15 5.34315 13.6569 4 12 4ZM7 7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7C17 9.76142 14.7614 12 12 12C9.23858 12 7 9.76142 7 7ZM12.0001 15C8.3441 15 5.5 17.7501 5.5 20.9999C5.5 21.5522 5.05228 21.9999 4.5 21.9999C3.94772 21.9999 3.5 21.5522 3.5 20.9999C3.5 16.5178 7.37176 13 12.0001 13C16.6283 13 20.5 16.5179 20.5 20.9999C20.5 21.5522 20.0523 21.9999 19.5 21.9999C18.9477 21.9999 18.5 21.5522 18.5 20.9999C18.5 17.7502 15.656 15 12.0001 15Z"/>
                  </svg>
                </span>
                <span>Officer Portal</span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="sidebar-footer">
      <div id="sidebarUserBox" class="sidebar-user-card">
        ${user ? `
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
            <span class="sidebar-link-icon" style="color: var(--primary-light);">
              ${user.role === 'admin' || user.role === 'officer' ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              `}
            </span>
            <div style="line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <strong style="color: #fff; font-size: 0.85rem;">${user.name}</strong>
              <div style="color: var(--primary-light); font-size: 0.72rem; text-transform: uppercase;">${user.role}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="logout()" style="padding: 4px 8px; font-size: 0.75rem;">Exit</button>
        ` : `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="sidebar-link-icon" style="color: var(--text-muted);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <span style="color: var(--text-muted); font-size: 0.82rem;">Guest Mode</span>
          </div>
          <a href="auth.html" class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">Sign In</a>
        `}
      </div>

      <div class="sidebar-db-status">
        <span id="sidebarDbStatusBadge"><span class="status-dot"></span> Checking DB...</span>
        <span style="font-size: 0.7rem; opacity: 0.6;">Ctrl+B</span>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Toggle & close handlers
  window.openSidebar = function() {
    sidebar.classList.add('open');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeSidebar = function() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.toggleSidebar = function() {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  const toggleBtn = document.getElementById('sidebarToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
  }

  const closeBtn = document.getElementById('sidebarCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
  }

  backdrop.addEventListener('click', closeSidebar);

  // Keyboard accessibility: Esc to close, Ctrl+B / Cmd+B to toggle
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Dynamic active link highlight on hashchange
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    const links = sidebar.querySelectorAll('.sidebar-link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (hash && href && href.includes(hash)) {
        link.classList.add('active');
      } else if (hash && href === 'index.html') {
        link.classList.remove('active');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderRoleBasedSidebar();
  renderNavUser();
  initLeftSidebar();
  checkMySQLConnection();
  setInterval(checkMySQLConnection, 15000);
});

