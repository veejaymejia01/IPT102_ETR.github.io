const API = 'https://etr-backend.onrender.com/api';

function seedUsers() {
  const users = JSON.parse(localStorage.getItem('healthcare_users') || '[]');
  
  if (!users.find((u) => u.email === 'admin@hospital.com')) {
    users.push({
      id: 1,
      name: 'System Admin',
      email: 'admin@hospital.com',
      password: 'admin123',
      role: 'admin'
    });
  }

  if (!users.find((u) => u.email === 'doctor@hospital.com')) {
    users.push({
      id: 2,
      name: 'Doctor User',
      email: 'doctor@hospital.com',
      password: 'doctor123',
      role: 'doctor'
    });
  }

  localStorage.setItem('healthcare_users', JSON.stringify(users));

  if (!localStorage.getItem('patients')) {
    localStorage.setItem('patients', JSON.stringify([
      {
        id: 101,
        name: 'Juan Dela Cruz',
        email: 'juan@email.com',
        phone: '09123456789',
        condition: 'General',
        diagnosis: 'Pending assessment'
      }
    ]));
  }

  if (!localStorage.getItem('appointments')) {
    localStorage.setItem('appointments', JSON.stringify([]));
  }

  if (!localStorage.getItem('bills')) {
    localStorage.setItem('bills', JSON.stringify([]));
  }

  if (!localStorage.getItem('notifications')) {
    localStorage.setItem('notifications', JSON.stringify([]));
  }
}

function login() {
  seedUsers();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorBox = document.getElementById('loginError');

  errorBox.innerText = '';

  const users = JSON.parse(localStorage.getItem('healthcare_users') || '[]');
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    errorBox.innerText = 'Invalid email or password';
    return;
  }

  localStorage.setItem('healthcare_user', JSON.stringify(user));

  if (user.role === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else if (user.role === 'doctor') {
    window.location.href = 'doctor-dashboard.html';
  }
}
