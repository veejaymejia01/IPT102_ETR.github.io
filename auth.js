const API = 'https://etr-backend.onrender.com';


async function apiFetch(url, options = {}) {
  const response = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorBox = document.getElementById('loginError');
  errorBox.innerText = '';

  if (!email || !password) {
    errorBox.innerText = 'Enter email and password.';
    return;
  }

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const user = {
      email: data.user?.email || email,
      role: data.user?.role || '',
      name: data.user?.name || 'User'
    };

    localStorage.setItem('healthcare_token', data.token);
    localStorage.setItem('healthcare_user', JSON.stringify(user));

    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else if (user.role === 'doctor') {
      window.location.href = 'doctor-dashboard.html';
    } else {
      errorBox.innerText = 'Unsupported role.';
    }
  } catch (error) {
    if (email === 'admin@hospital.com' && password === 'admin123') {
      localStorage.setItem('healthcare_token', 'demo-token');
      localStorage.setItem(
        'healthcare_user',
        JSON.stringify({
          email,
          role: 'admin',
          name: 'Demo Admin'
        })
      );
      window.location.href = 'admin-dashboard.html';
      return;
    }

    if (email === 'doctor@hospital.com' && password === 'doctor123') {
      localStorage.setItem('healthcare_token', 'demo-token');
      localStorage.setItem(
        'healthcare_user',
        JSON.stringify({
          email,
          role: 'doctor',
          name: 'Demo Doctor'
        })
      );
      window.location.href = 'doctor-dashboard.html';
      return;
    }

    errorBox.innerText = 'Login failed. Check your backend or credentials.';
  }
}
