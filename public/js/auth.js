// JWT Authentication Logic

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

function fillCreds(email, password) {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  showToast(`Pre-filled credentials for ${email}`, 'info');
}

async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const workflow = window.activeWorkflowRole || 'MAKER';

  const btn = document.getElementById('btnLoginSubmit');
  btn.disabled = true;
  btn.textContent = 'Authenticating JWT...';

  if (workflow === 'MAKER') {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@(?:gmail|googlemail)\.com$/i;
    if (!gmailRegex.test(email)) {
      showToast('Please enter a valid Gmail address (ending in @gmail.com) for Maker login.', 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In to Portal ➔';
      return;
    }
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, workflow })
    });

    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem('apex_jwt_token', data.token);
      localStorage.setItem('apex_user', JSON.stringify(data.user));
      showToast(`Welcome back, ${data.user.name}! (Role: ${data.user.role})`, 'success');

      // If a custom redirect callback is defined (from auth.html), use it
      if (typeof window._onLoginSuccess === 'function') {
        window._onLoginSuccess(data.user);
      } else {
        // Default role-based redirect
        const role = (data.user.role || '').toUpperCase();
        setTimeout(() => {
          if (role === 'CHECKER' || role === 'OFFICER') {
            window.location.replace('checker.html');
          } else if (role === 'MAKER') {
            window.location.replace('maker.html');
          } else if (role === 'ADMIN') {
            window.location.replace('admin.html');
          } else {
            window.location.replace('maker.html');
          }
        }, 700);
      }
    } else {
      showToast(data.message || 'Login failed. Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to authentication server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In to Portal ➔';
  }
}

async function submitRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  const btn = document.getElementById('btnRegisterSubmit');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });

    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem('apex_jwt_token', data.token);
      localStorage.setItem('apex_user', JSON.stringify(data.user));
      showToast('Registration successful! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = 'apply.html';
      }, 1000);
    } else {
      showToast(data.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Customer Account ➔';
  }
}
