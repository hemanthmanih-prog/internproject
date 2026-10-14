/**
 * ============================================================
 *  ApexLoan — Centralized Auth Guard & Role-Based Nav Renderer
 *  Enforces: Login required + Role segregation (Maker/Checker)
 * ============================================================
 */

// ─── Page Access Rules ───────────────────────────────────────
// Maps each page to the roles that are allowed to access it.
// 'ALL' means any authenticated user can access.
const PAGE_ACCESS = {
  'maker.html':   ['MAKER', 'CHECKER', 'OFFICER', 'ADMIN', 'CUSTOMER'],  // any login can open Maker page
  'checker.html': ['CHECKER', 'OFFICER', 'ADMIN'],   // only CHECKER role (hemanthmanih@gmail.com)
  'admin.html':   ['ADMIN'],
  'apply.html':   ['MAKER', 'CHECKER', 'OFFICER', 'ADMIN', 'CUSTOMER'], // any login can open Apply page
  'track.html':   ['CHECKER', 'OFFICER', 'ADMIN'],
  'index.html':   ['MAKER', 'CHECKER', 'OFFICER', 'ADMIN'],
};

// ─── Navigation Items per Role ────────────────────────────────
// Each nav item has: href, label, icon (SVG path string), badge (optional)
const NAV_ITEMS = {
  MAKER: [
    {
      href: 'maker.html',
      label: 'Maker Dashboard',
      badge: { text: 'Maker', color: '#38bdf8', bg: 'rgba(6,182,212,0.2)', border: 'rgba(6,182,212,0.4)' },
      icon: `<path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`
    },
    {
      href: 'apply.html',
      label: 'Apply for Loan',
      icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>`
    }
  ],
  CHECKER: [
    {
      href: 'checker.html',
      label: 'Authorization Queue',
      badge: { text: 'Four-Eyes', color: '#34d399', bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)' },
      icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>`
    },
    {
      href: 'checker.html#tracker',
      label: 'Track & Maker Audit',
      action: "if(window.location.pathname.includes('checker.html') && typeof switchCheckerView==='function'){switchCheckerView('tracker');}else{window.location.href='checker.html#tracker';}",
      icon: `<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>`
    }
  ],
  OFFICER: [
    {
      href: 'checker.html',
      label: 'Authorization Queue',
      badge: { text: 'Four-Eyes', color: '#34d399', bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)' },
      icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>`
    },
    {
      href: 'checker.html#tracker',
      label: 'Track & Maker Audit',
      action: "if(window.location.pathname.includes('checker.html') && typeof switchCheckerView==='function'){switchCheckerView('tracker');}else{window.location.href='checker.html#tracker';}",
      icon: `<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>`
    }
  ],
  ADMIN: [
    {
      href: 'admin.html',
      label: 'Admin Analytics',
      badge: { text: 'Admin', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)' },
      icon: `<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>`
    },
    {
      href: 'maker.html',
      label: 'Maker Console',
      icon: `<path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`
    },
    {
      href: 'checker.html',
      label: 'Checker Desk',
      icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>`
    },
    {
      href: 'apply.html',
      label: 'Apply for Loan',
      icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>`
    },
    {
      href: 'track.html',
      label: 'Track Status',
      icon: `<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>`
    }
  ]
};

// Always-visible nav item (Sign Out) for all authenticated roles
const SIGNOUT_NAV_ITEM = {
  href: '#',
  label: 'Sign Out',
  action: 'logout()',
  icon: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>`
};

// ─── Core Guard Function ──────────────────────────────────────
/**
 * Call this on any protected page's DOMContentLoaded.
 * Checks login + role, then injects role-filtered sidebar nav.
 * @param {string[]} allowedRoles  Roles permitted on THIS page
 */
function applyAuthGuard(allowedRoles) {
  const token = localStorage.getItem('apex_jwt_token');
  const rawUser = localStorage.getItem('apex_user');

  // 1. No login → auth page
  if (!token || !rawUser) {
    sessionStorage.setItem('auth_error_message', '🔒 Access Restricted: Please sign in with your Maker or Checker credentials.');
    sessionStorage.setItem('auth_target_url', window.location.pathname);
    window.location.replace('auth.html');
    return;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch (e) {
    localStorage.clear();
    window.location.replace('auth.html');
    return;
  }

  const role = (user.role || '').toUpperCase();
  const allowed = (allowedRoles || []).map(r => r.toUpperCase());
  const currentPath = window.location.pathname.toLowerCase();

  // 2. Wrong role → redirect to their own dashboard (prevent infinite loops)
  const isPermitted = allowed.length === 0 || allowed.includes('ALL') || allowed.includes(role);
  if (!isPermitted) {
    if (role === 'MAKER' && !currentPath.includes('maker.html')) {
      sessionStorage.setItem('auth_error_message', '⛔ Access Denied: Your Maker role cannot access this area. Redirected to Maker Console.');
      window.location.replace('maker.html');
      return;
    } else if ((role === 'CHECKER' || role === 'OFFICER') && !currentPath.includes('checker.html')) {
      sessionStorage.setItem('auth_error_message', '⛔ Access Denied: Your Checker role cannot access this area. Redirected to Checker Desk.');
      window.location.replace('checker.html');
      return;
    } else if (role === 'ADMIN' && !currentPath.includes('admin.html')) {
      window.location.replace('admin.html');
      return;
    } else if (!currentPath.includes('auth.html')) {
      sessionStorage.setItem('auth_error_message', '⛔ Access Denied: Unauthorized role access.');
      window.location.replace('auth.html');
      return;
    }
  }

  // 3. Render role-filtered navigation
  _renderRoleNav(user, role);

  // 4. Update header profile chip
  _updateHeaderChip(user, role);

  // 5. Show any queued auth error toasts
  const storedMsg = sessionStorage.getItem('auth_error_message');
  if (storedMsg) {
    sessionStorage.removeItem('auth_error_message');
    setTimeout(() => { if (typeof showToast === 'function') showToast(storedMsg, 'error'); }, 400);
  }
}

// ─── Nav Renderer ─────────────────────────────────────────────
function _renderRoleNav(user, role) {
  const navMenu = document.getElementById('appNavMenu');
  if (!navMenu) return; // No nav element on this page

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const items = NAV_ITEMS[role] || NAV_ITEMS['MAKER'];

  let html = '';
  for (const item of items) {
    const isActive = item.href === currentFile;
    const badgeHtml = item.badge
      ? `<span class="st-beta-badge" style="background:${item.badge.bg};color:${item.badge.color};border-color:${item.badge.border};">${item.badge.text}</span>`
      : '';

    html += `
      <a href="${item.href}" class="st-nav-item${isActive ? ' active' : ''}" ${item.action ? `onclick="event.preventDefault();${item.action}"` : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${item.icon}</svg>
        <span>${item.label}</span>
        ${badgeHtml}
      </a>`;
  }

  // Always add Sign Out at the bottom
  html += `
    <a href="#" class="st-nav-item" onclick="event.preventDefault();logout();" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.07);padding-top:10px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${SIGNOUT_NAV_ITEM.icon}</svg>
      <span style="color:#fb7185;">Sign Out</span>
    </a>`;

  navMenu.innerHTML = html;
}

// ─── Header Chip Updater ──────────────────────────────────────
function _updateHeaderChip(user, role) {
  const headerName   = document.getElementById('headerName');
  const headerRole   = document.getElementById('headerRole');
  const headerTag    = document.getElementById('headerTag');
  const headerAvatar = document.getElementById('headerAvatar');
  const profileChip  = document.getElementById('userProfileChip');

  if (headerName) headerName.textContent = user.name || role;

  if (headerRole) {
    headerRole.textContent = role;
    if (role === 'MAKER') {
      headerRole.style.cssText = 'background:rgba(6,182,212,0.2);color:#38bdf8;';
    } else if (role === 'CHECKER' || role === 'OFFICER') {
      headerRole.style.cssText = 'background:rgba(16,185,129,0.2);color:#34d399;';
    } else if (role === 'ADMIN') {
      headerRole.style.cssText = 'background:rgba(245,158,11,0.2);color:#fbbf24;';
    }
  }

  if (headerTag) headerTag.textContent = `@${(user.role || 'user').toLowerCase()}`;

  if (headerAvatar) {
    const initials = (user.name || role).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    headerAvatar.textContent = initials;
    if (role === 'MAKER') {
      headerAvatar.style.background = 'linear-gradient(135deg, #06b6d4, #3b82f6)';
    } else if (role === 'CHECKER' || role === 'OFFICER') {
      headerAvatar.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
    } else if (role === 'ADMIN') {
      headerAvatar.style.background = 'linear-gradient(135deg, #f59e0b, #ef4444)';
    }
  }

  if (profileChip) {
    profileChip.title = `Signed in as ${user.name} (${role}) — Click to Sign Out`;
    profileChip.style.cursor = 'pointer';
    profileChip.onclick = () => {
      if (confirm(`Sign out of ${user.name} (${role})?`)) logout();
    };
  }
}

/**
 * Convenience: run the guard automatically when this script loads
 * by reading data-roles attribute from <body> tag.
 * Usage: <body data-roles="MAKER,ADMIN">
 */
document.addEventListener('DOMContentLoaded', () => {
  const bodyRoles = document.body.getAttribute('data-roles');
  if (bodyRoles !== null) {
    const roles = bodyRoles ? bodyRoles.split(',').map(r => r.trim()) : [];
    applyAuthGuard(roles);
  }
});
