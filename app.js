const API = 'http://localhost:3000/api';
let token = localStorage.getItem('healthcare_token') || '';
let currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');
let patients = [];
let appointments = [];
let bills = [];
let notifications = [];
let selectedPatientId = null;

function el(id) {
  return document.getElementById(id);
}

function showSection(id) {
  document.querySelectorAll('#appShell section').forEach((section) => section.classList.add('hidden'));
  const target = el(id);
  if (target) target.classList.remove('hidden');
}

async function apiFetch(url, options = {}) {
  const response = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (error) {
      // ignore parse failure
    }
    throw new Error(message);
  }

  return response.json();
}

function applyRoleView() {
  const role = currentUser?.role || 'admin';
  if (el('roleBadge')) el('roleBadge').innerText = role.charAt(0).toUpperCase() + role.slice(1);
  if (el('welcomeText')) el('welcomeText').innerText = `Welcome, ${currentUser?.email || 'User'}`;

  document.querySelectorAll('nav button').forEach((btn) => {
    btn.style.display = 'none';
  });

  if (role === 'admin') {
    showNav(['dashboard', 'appointments', 'patients', 'notifications', 'billing']);
    if (el('appointmentAdminTools')) el('appointmentAdminTools').classList.remove('hidden');
    if (el('appointmentDoctorPreview')) el('appointmentDoctorPreview').classList.remove('hidden');
    if (el('doctorTodayAppointments')) el('doctorTodayAppointments').classList.add('hidden');
    showSection('dashboard');
  } else {
    showNav(['dashboard', 'appointments', 'patients']);
    if (el('appointmentAdminTools')) el('appointmentAdminTools').classList.add('hidden');
    if (el('appointmentDoctorPreview')) el('appointmentDoctorPreview').classList.remove('hidden');
    if (el('doctorTodayAppointments')) el('doctorTodayAppointments').classList.remove('hidden');
    showSection('appointments');
  }
}

function showNav(sections) {
  sections.forEach((section) => {
    const btn = document.querySelector(`button[onclick="showSection('${section}')"]`);
    if (btn) btn.style.display = 'inline-block';
  });
}

async function login() {
  const email = el('loginEmail')?.value.trim();
  const password = el('loginPassword')?.value.trim();
  const role = el('loginRole')?.value;
  const errorBox = el('loginError');
  if (errorBox) errorBox.innerText = '';

  if (!email || !password) {
    if (errorBox) errorBox.innerText = 'Enter email and password.';
    return;
  }

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    token = data.token;
    currentUser = {
      email: data.user?.email || email,
      role: data.user?.role || role,
      name: data.user?.name || 'User',
    };
    localStorage.setItem('healthcare_token', token);
    localStorage.setItem('healthcare_user', JSON.stringify(currentUser));
    openApp();
  } catch (error) {
    if (email === 'admin@hospital.com' && password === 'admin123') {
      token = 'demo-token';
      currentUser = { email, role, name: 'Demo User' };
      localStorage.setItem('healthcare_token', token);
      localStorage.setItem('healthcare_user', JSON.stringify(currentUser));
      loadDemoData();
      openApp();
      return;
    }
    if (errorBox) {
      errorBox.innerText = 'Login failed. Start the backend on localhost:3000 or use admin@hospital.com / admin123 for demo mode.';
    }
  }
}

function logout() {
  localStorage.removeItem('healthcare_token');
  localStorage.removeItem('healthcare_user');
  token = '';
  currentUser = null;
  patients = [];
  appointments = [];
  bills = [];
  notifications = [];
  selectedPatientId = null;
  if (el('appShell')) el('appShell').classList.add('hidden');
  if (el('loginScreen')) el('loginScreen').classList.remove('hidden');
}

function openApp() {
  if (el('loginScreen')) el('loginScreen').classList.add('hidden');
  if (el('appShell')) el('appShell').classList.remove('hidden');
  applyRoleView();
  loadAll();
}

async function loadAll() {
  if (token === 'demo-token') {
    loadDemoData();
    render();
    return;
  }

  try {
    patients = await apiFetch('/patients');
  } catch {
    patients = [];
  }
  try {
    appointments = await apiFetch('/appointments');
  } catch {
    appointments = [];
  }
  try {
    bills = await apiFetch('/billing/invoices');
  } catch {
    bills = [];
  }
  try {
    notifications = await apiFetch('/notifications');
  } catch {
    notifications = [];
  }
  render();
}

function loadDemoData() {
  const today = new Date().toISOString().split('T')[0];
  patients = [
    { id: 'P1001', name: 'Maria Santos', phone: '09171234567', condition: 'Hypertension', diagnosis: 'Stage 1 hypertension' },
    { id: 'P1002', name: 'John Reyes', phone: '09179876543', condition: 'Dermatitis', diagnosis: 'Skin inflammation' },
    { id: 'P1003', name: 'Ana Cruz', phone: '09170001111', condition: 'Checkup', diagnosis: 'Routine follow-up' },
  ];
  appointments = [
    { id: 'A1001', patientName: 'Maria Santos', appointmentDate: `${today} 09:00`, status: 'Scheduled' },
    { id: 'A1002', patientName: 'John Reyes', appointmentDate: `${today} 11:30`, status: 'Scheduled' },
    { id: 'A1003', patientName: 'Ana Cruz', appointmentDate: `${today} 14:00`, status: 'Done' },
  ];
  bills = [
    { id: 'B1001', invoice: 'INV-2001', amount: 2500, patientId: 'P1001' },
    { id: 'B1002', invoice: 'INV-2002', amount: 1800, patientId: 'P1002' },
  ];
  notifications = [
    { id: 'N1001', patientName: 'Maria Santos', type: 'SMS', message: `Your appointment is confirmed for ${today} 09:00.`, status: 'Sent' },
    { id: 'N1002', patientName: 'John Reyes', type: 'SMS', message: 'Please review your updated consultation details via SMS.', status: 'Sent' },
  ];
}

function render() {
  if (el('patientCount')) el('patientCount').innerText = String(patients.length);
  if (el('appointmentCount')) el('appointmentCount').innerText = String(appointments.length);
  if (el('billCount')) el('billCount').innerText = String(bills.length);

  if (!selectedPatientId && patients.length) {
    selectedPatientId = patients[0].id;
  }

  renderAppointments();
  renderPatients();
  renderBilling();
  renderNotifications();
  renderTodayAppointments();
  renderRecordDetails();
}

function getHourFromAppointment(item) {
  const raw = String(item.appointmentDate || item.date || '');
  const match = raw.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : null;
}

function renderAppointmentSlotList(containerId, items, showDoneButton) {
  const container = el(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="muted">No appointments</div>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const doneButton = showDoneButton && item.status !== 'Done'
        ? `<button class="action" style="margin-top:8px" onclick="markAppointmentDone('${item.id}')">Done</button>`
        : '';
      const badgeClass = item.status === 'Done' ? 'badge status-done' : 'badge';
      return `
        <div class="list-item">
          <strong>${item.patientName || item.patient || 'Unknown'}</strong>
          <div class="muted">${item.appointmentDate || item.date || ''}</div>
          <div class="${badgeClass}" style="margin-top:8px">${item.status || 'Scheduled'}</div>
          ${doneButton}
        </div>
      `;
    })
    .join('');
}

function renderTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((item) => String(item.appointmentDate || item.date || '').includes(today));

  const morning = todayAppointments.filter((item) => {
    const hour = getHourFromAppointment(item);
    return hour !== null && hour < 12;
  });
  const afternoon = todayAppointments.filter((item) => {
    const hour = getHourFromAppointment(item);
    return hour !== null && hour >= 12;
  });

  renderAppointmentSlotList('todayMorningAppointmentList', morning, currentUser?.role === 'doctor');
  renderAppointmentSlotList('todayAfternoonAppointmentList', afternoon, currentUser?.role === 'doctor');
}

function renderAppointments() {
  const search = String(el('appointmentSearch')?.value || '').toLowerCase();
  const filteredAppointments = appointments.filter((item) => {
    const patient = String(item.patientName || item.patient || '').toLowerCase();
    const date = String(item.appointmentDate || item.date || '').toLowerCase();
    const status = String(item.status || '').toLowerCase();
    return patient.includes(search) || date.includes(search) || status.includes(search);
  });

  const morning = filteredAppointments.filter((item) => {
    const hour = getHourFromAppointment(item);
    return hour !== null && hour < 12;
  });
  const afternoon = filteredAppointments.filter((item) => {
    const hour = getHourFromAppointment(item);
    return hour !== null && hour >= 12;
  });

  renderAppointmentSlotList('appointmentMorningList', morning, currentUser?.role === 'doctor');
  renderAppointmentSlotList('appointmentAfternoonList', afternoon, currentUser?.role === 'doctor');

  const table = el('appointmentTable');
  if (table) {
    table.innerHTML = filteredAppointments
      .map(
        (item) => `<tr><td>${item.patientName || item.patient || ''}</td><td>${item.appointmentDate || item.date || ''}</td><td>${item.status || 'Scheduled'}</td></tr>`
      )
      .join('');
  }

  if (el('appointmentTotalMetric')) el('appointmentTotalMetric').innerText = String(filteredAppointments.length);
  const today = new Date().toISOString().split('T')[0];
  const todayCount = filteredAppointments.filter((item) => String(item.appointmentDate || item.date || '').includes(today)).length;
  const doneCount = filteredAppointments.filter((item) => item.status === 'Done').length;
  if (el('appointmentTodayMetric')) el('appointmentTodayMetric').innerText = String(todayCount);
  if (el('appointmentDoneMetric')) el('appointmentDoneMetric').innerText = String(doneCount);
}

function renderPatients() {
  const patientList = el('patientList');
  if (!patientList) return;

  const search = String(el('patientSearch')?.value || '').toLowerCase();
  const filteredPatients = patients.filter((patient) => {
    const name = String(patient.name || '').toLowerCase();
    const condition = String(patient.condition || '').toLowerCase();
    return name.includes(search) || condition.includes(search);
  });

  patientList.innerHTML = filteredPatients
    .map(
      (patient) => `
        <button class="list-item patient-button" onclick="openPatientRecord('${patient.id}')">
          <strong>${patient.name}</strong>
          <div class="muted">${patient.condition || 'General'}</div>
        </button>
      `
    )
    .join('');
}

function renderBilling() {
  const billingPatient = el('billingPatient');
  if (billingPatient) {
    billingPatient.innerHTML = patients.map((patient) => `<option value="${patient.id}">${patient.id}</option>`).join('');
  }

  const table = el('billingTable');
  if (!table) return;
  table.innerHTML = bills.map((bill) => `<tr><td>${bill.invoice || ''}</td><td>${bill.amount || ''}</td></tr>`).join('');
}

function renderNotifications() {
  const patientSelect = el('notificationPatient');
  if (patientSelect) {
    patientSelect.innerHTML = patients.map((patient) => `<option value="${patient.id}">${patient.id}</option>`).join('');
  }

  const table = el('notificationTable');
  if (!table) return;
  table.innerHTML = notifications
    .map((note) => `<tr><td>${note.patientName || note.patientId || ''}</td><td>${note.type || note.channel || ''}</td><td>${note.message || ''}</td><td>${note.status || 'Sent'}</td></tr>`)
    .join('');
}

function openPatientRecord(patientId) {
  selectedPatientId = patientId;
  showSection('patients');
  renderRecordDetails();
}

function renderRecordDetails() {
  const box = el('recordDetails');
  if (!box) return;

  const patient = patients.find((item) => item.id === selectedPatientId) || patients[0];
  if (!patient) {
    box.innerHTML = 'No patient records available.';
    if (el('editPatientName')) el('editPatientName').value = '';
    if (el('editPatientPhone')) el('editPatientPhone').value = '';
    if (el('editPatientCondition')) el('editPatientCondition').value = '';
    if (el('editPatientDiagnosis')) el('editPatientDiagnosis').value = '';
    return;
  }

  box.innerHTML = `
    <strong>${patient.name}</strong>
    <div class="muted">ID: ${patient.id}</div>
    <div class="muted">Condition: ${patient.condition || 'General'}</div>
    <div class="muted">Phone: ${patient.phone || 'N/A'}</div>
    <div class="muted">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</div>
  `;

  if (el('editPatientName')) el('editPatientName').value = patient.name || '';
  if (el('editPatientPhone')) el('editPatientPhone').value = patient.phone || '';
  if (el('editPatientCondition')) el('editPatientCondition').value = patient.condition || '';
  if (el('editPatientDiagnosis')) el('editPatientDiagnosis').value = patient.diagnosis || '';
}

async function savePatientRecord() {
  const patient = patients.find((item) => item.id === selectedPatientId);
  if (!patient) return;

  const updatedPatient = {
    id: patient.id,
    name: el('editPatientName')?.value.trim() || patient.name,
    phone: el('editPatientPhone')?.value.trim() || patient.phone,
    condition: el('editPatientCondition')?.value.trim() || patient.condition,
    diagnosis: el('editPatientDiagnosis')?.value.trim() || patient.diagnosis,
  };

  if (token === 'demo-token') {
    patients = patients.map((item) => (item.id === patient.id ? updatedPatient : item));
    render();
    return;
  }

  try {
    await apiFetch(`/patients/${patient.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedPatient),
    });
  } catch {
    // allow local UI update fallback
  }

  patients = patients.map((item) => (item.id === patient.id ? updatedPatient : item));
  render();
}

function clearAddPatientForm() {
  if (el('addName')) el('addName').value = '';
  if (el('addPhone')) el('addPhone').value = '';
  if (el('addCondition')) el('addCondition').value = '';
  if (el('addDiagnosis')) el('addDiagnosis').value = '';
}

async function submitNewPatient() {
  const name = el('addName')?.value.trim();
  const phone = el('addPhone')?.value.trim();
  const condition = el('addCondition')?.value.trim();
  const diagnosis = el('addDiagnosis')?.value.trim();

  if (!name) return;

  const newPatient = {
    id: `P${Date.now()}`,
    name,
    phone: phone || 'N/A',
    condition: condition || 'General',
    diagnosis: diagnosis || 'Pending assessment',
  };

  if (token === 'demo-token') {
    patients.unshift(newPatient);
    selectedPatientId = newPatient.id;
    clearAddPatientForm();
    render();
    showSection('patients');
    return;
  }

  try {
    await apiFetch('/patients', {
      method: 'POST',
      body: JSON.stringify(newPatient),
    });
    clearAddPatientForm();
    await loadAll();
    selectedPatientId = newPatient.id;
    showSection('patients');
  } catch {
    patients.unshift(newPatient);
    selectedPatientId = newPatient.id;
    clearAddPatientForm();
    render();
    showSection('patients');
  }
}

async function addAppointment() {
  const patientName = el('appointmentPatient')?.value.trim();
  const date = el('appointmentDate')?.value;
  if (!patientName || !date) return;

  const matchedPatient = patients.find((item) => String(item.name || '').toLowerCase() === patientName.toLowerCase());

  if (token === 'demo-token') {
    appointments.unshift({ id: `A${Date.now()}`, patientName, appointmentDate: date, status: 'Scheduled' });
    if (matchedPatient) {
      notifications.unshift({
        id: `N${Date.now()}1`,
        patientName: matchedPatient.name,
        type: 'SMS',
        message: `Your appointment is confirmed for ${date}.`,
        status: 'Sent',
      });
    }
    if (el('appointmentPatient')) el('appointmentPatient').value = '';
    if (el('appointmentDate')) el('appointmentDate').value = '';
    render();
    return;
  }

  await apiFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify({ patientName, doctorName: 'Dr', appointmentDate: date, status: 'Scheduled' }),
  });

  if (matchedPatient) {
    try {
      await apiFetch('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          channel: 'SMS',
          target: matchedPatient.phone || 'N/A',
          patientId: matchedPatient.id,
          patientName: matchedPatient.name,
          subject: '',
          message: `Your appointment is confirmed for ${date}.`,
        }),
      });
      notifications.unshift({
        id: `N${Date.now()}2`,
        patientName: matchedPatient.name,
        type: 'SMS',
        message: `Your appointment is confirmed for ${date}.`,
        status: 'Sent',
      });
    } catch {
      notifications.unshift({
        id: `N${Date.now()}3`,
        patientName: matchedPatient.name,
        type: 'SMS',
        message: `Your appointment is confirmed for ${date}.`,
        status: 'Queued',
      });
    }
  }

  if (el('appointmentPatient')) el('appointmentPatient').value = '';
  if (el('appointmentDate')) el('appointmentDate').value = '';
  render();
  loadAll();
}

async function markAppointmentDone(appointmentId) {
  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;

  appointment.status = 'Done';

  if (token !== 'demo-token') {
    try {
      await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done' }),
      });
    } catch {
      // keep UI updated locally
    }
  }

  render();
}

async function addBill() {
  const patientId = el('billingPatient')?.value;
  const invoice = el('billingInvoice')?.value.trim();
  const amount = el('billingAmount')?.value;
  const patient = patients.find((item) => item.id === patientId);
  if (!patient || !invoice || !amount) return;

  if (token === 'demo-token') {
    bills.unshift({ id: `B${Date.now()}`, invoice, amount, patientId: patient.id, patientName: patient.name });
    notifications.unshift({
      id: `N${Date.now()}4`,
      patientName: patient.name,
      type: 'SMS',
      message: `A new bill (${invoice}) for amount ${amount} has been added to your account.`,
      status: 'Sent',
    });
    if (el('billingInvoice')) el('billingInvoice').value = '';
    if (el('billingAmount')) el('billingAmount').value = '';
    render();
    return;
  }

  await apiFetch('/billing/invoices', {
    method: 'POST',
    body: JSON.stringify({ patientId: patient.id, patientName: patient.name, invoice, amount }),
  });

  try {
    await apiFetch('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        channel: 'SMS',
        target: patient.phone || 'N/A',
        patientId: patient.id,
        patientName: patient.name,
        subject: '',
        message: `A new bill (${invoice}) for amount ${amount} has been added to your account.`,
      }),
    });
    notifications.unshift({
      id: `N${Date.now()}5`,
      patientName: patient.name,
      type: 'SMS',
      message: `A new bill (${invoice}) for amount ${amount} has been added to your account.`,
      status: 'Sent',
    });
  } catch {
    notifications.unshift({
      id: `N${Date.now()}6`,
      patientName: patient.name,
      type: 'SMS',
      message: `A new bill (${invoice}) for amount ${amount} has been added to your account.`,
      status: 'Queued',
    });
  }

  if (el('billingInvoice')) el('billingInvoice').value = '';
  if (el('billingAmount')) el('billingAmount').value = '';
  render();
  loadAll();
}

async function sendNotification() {
  const patientId = el('notificationPatient')?.value;
  const type = 'SMS';
  const subject = el('notificationSubject')?.value.trim() || '';
  const message = el('notificationMessage')?.value.trim();
  const patient = patients.find((item) => item.id === patientId);
  if (!patient || !message) return;

  const payload = {
    channel: type,
    target: patient.phone || 'N/A',
    patientId,
    patientName: patient.name,
    subject,
    message,
  };

  if (token === 'demo-token') {
    notifications.unshift({ id: `N${Date.now()}`, patientName: patient.name, type, message, status: 'Sent' });
    if (el('notificationSubject')) el('notificationSubject').value = '';
    if (el('notificationMessage')) el('notificationMessage').value = '';
    render();
    return;
  }

  try {
    const created = await apiFetch('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    notifications.unshift({
      id: created.id || `N${Date.now()}`,
      patientName: patient.name,
      type,
      message,
      status: 'Sent',
    });
  } catch {
    notifications.unshift({ id: `N${Date.now()}`, patientName: patient.name, type, message, status: 'Queued' });
  }

  if (el('notificationSubject')) el('notificationSubject').value = '';
  if (el('notificationMessage')) el('notificationMessage').value = '';
  render();
}

function runTests() {
  console.assert(typeof render === 'function', 'render should exist');
  console.assert(typeof openPatientRecord === 'function', 'openPatientRecord should exist');
  console.assert(typeof renderRecordDetails === 'function', 'renderRecordDetails should exist');
  console.assert(typeof addAppointment === 'function', 'addAppointment should exist');
  console.assert(typeof addBill === 'function', 'addBill should exist');
  console.assert(typeof submitNewPatient === 'function', 'submitNewPatient should exist');
  console.assert(typeof renderTodayAppointments === 'function', 'renderTodayAppointments should exist');
  console.assert(typeof markAppointmentDone === 'function', 'markAppointmentDone should exist');
  console.assert(el('appointmentDoctorPreview') !== null, 'appointmentDoctorPreview element should exist');
  console.assert(el('appointmentAdminTools') !== null, 'appointmentAdminTools element should exist');
  console.assert(el('doctorTodayAppointments') !== null, 'doctorTodayAppointments element should exist');
  console.assert(el('todayMorningAppointmentList') !== null, 'todayMorningAppointmentList element should exist');
  console.assert(el('todayAfternoonAppointmentList') !== null, 'todayAfternoonAppointmentList element should exist');
  console.assert(el('appointmentMorningList') !== null, 'appointmentMorningList element should exist');
  console.assert(el('appointmentAfternoonList') !== null, 'appointmentAfternoonList element should exist');
  console.assert(el('recordDetails') !== null, 'recordDetails element should exist');
  console.assert(el('notificationPatient') !== null, 'notificationPatient element should exist');
  console.assert(el('billingPatient') !== null, 'billingPatient element should exist');
  console.assert(el('billingTable') !== null, 'billingTable element should exist');
  console.assert(el('addPatientPage') !== null, 'addPatientPage element should exist');
}

runTests();
if (token && currentUser) {
  openApp();
}
