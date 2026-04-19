const API = 'https://etr-backend.onrender.com/api';


const token = localStorage.getItem('healthcare_token') || '';
const currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');

let patients = [];
let appointments = [];
let bills = [];
let notifications = [];
let selectedPatientId = null;

if (!currentUser || currentUser.role !== 'admin' || !token) {
  window.location.href = 'index.html';
}

function el(id) {
  return document.getElementById(id);
}

function setActiveNav(btn) {
  document.querySelectorAll('.nav-btn').forEach((nav) => nav.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function showSection(id, btn = null) {
  document.querySelectorAll('main section').forEach((section) => {
    section.classList.add('hidden');
  });

  const target = el(id);
  if (target) target.classList.remove('hidden');

  setActiveNav(btn);

  if (id === 'dashboard') {
    renderDashboard();
  }

  if (id === 'appointments') {
    renderAppointments();
  }

  if (id === 'patients') {
    renderPatients();
    renderRecordDetails();
  }

  if (id === 'notifications') {
    renderNotifications();
  }

  if (id === 'billing') {
    renderBilling();
  }
}

function logout() {
  localStorage.removeItem('healthcare_token');
  localStorage.removeItem('healthcare_user');
  window.location.href = 'index.html';
}

async function apiFetch(url, options = {}) {
  const response = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

async function loadAll() {
  patients = await apiFetch('/patients');
  appointments = await apiFetch('/appointments');
  bills = await apiFetch('/billing/invoices');
  notifications = await apiFetch('/notifications');

  if (!selectedPatientId && patients.length) {
    selectedPatientId = patients[0].id;
  }

  renderAll();
}

function renderAll() {
  renderDashboard();
  renderAppointments();
  renderPatients();
  renderBilling();
  renderNotifications();
  renderRecordDetails();
}

function renderDashboard() {
  if (el('welcomeText')) {
    el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  }

  if (el('patientCount')) {
    el('patientCount').innerText = String(patients.length);
  }

  if (el('appointmentCount')) {
    el('appointmentCount').innerText = String(appointments.length);
  }

  if (el('billCount')) {
    el('billCount').innerText = String(bills.length);
  }

  if (el('notificationCount')) {
    el('notificationCount').innerText = String(notifications.length);
  }
}

function renderAppointments() {
  const table = el('appointmentTable');
  if (!table) return;

  table.innerHTML = appointments.map((a) => `
    <tr>
      <td>${a.patientName || ''}</td>
      <td>${a.appointmentDate || ''}</td>
      <td>${a.status || 'Scheduled'}</td>
    </tr>
  `).join('');
}

function getStatus(patient) {
  if (!patient.diagnosis) {
    return { label: 'Pending', class: 'pending' };
  }

  const text = String(patient.diagnosis).toLowerCase();

  if (
    text.includes('critical') ||
    text.includes('pneumonia') ||
    text.includes('emergency')
  ) {
    return { label: 'Critical', class: 'critical' };
  }

  if (
    text.includes('follow') ||
    text.includes('check') ||
    text.includes('hypertension')
  ) {
    return { label: 'Follow-up', class: 'warning' };
  }

  return { label: 'Stable', class: 'stable' };
}

function renderPatients() {
  const table = el('patientTable');
  if (!table) return;

  const search = String(el('patientSearch')?.value || '').toLowerCase();

  const filtered = patients.filter((patient) => {
    const name = String(patient.name || '').toLowerCase();
    const email = String(patient.email || '').toLowerCase();
    const phone = String(patient.phone || '').toLowerCase();
    const condition = String(patient.condition || '').toLowerCase();
    const diagnosis = String(patient.diagnosis || '').toLowerCase();

    return (
      name.includes(search) ||
      email.includes(search) ||
      phone.includes(search) ||
      condition.includes(search) ||
      diagnosis.includes(search)
    );
  });

  table.innerHTML = filtered.map((patient) => {
    const status = getStatus(patient);

    return `
      <tr class="patient-row">
        <td>
          <strong>${patient.name || ''}</strong><br>
          <span class="sub-text">${patient.email || 'No email'}</span>
        </td>
        <td>${patient.phone || 'N/A'}</td>
        <td>${patient.condition || 'General'}</td>
        <td>
          <span class="badge ${status.class}">${status.label}</span><br>
          <span class="sub-text">${patient.diagnosis || 'Pending assessment'}</span>
        </td>
        <td>
          <button class="btn btn-secondary small-btn" onclick="selectPatient('${patient.id}')">
            Edit
          </button>
          <button class="btn btn-danger small-btn" onclick="deletePatient('${patient.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function selectPatient(id) {
  selectedPatientId = id;
  renderRecordDetails();
}

function renderRecordDetails() {
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  if (!patient) return;

  selectedPatientId = patient.id;

  const details = el('recordDetails');
  if (details) {
    details.innerHTML = `
      <strong>${patient.name || ''}</strong><br>
      <span class="sub-text">ID: ${patient.id || ''}</span><br>
      <span class="sub-text">Email: ${patient.email || 'No email'}</span><br>
      <span class="sub-text">Phone: ${patient.phone || 'N/A'}</span><br>
      <span class="sub-text">Condition: ${patient.condition || 'General'}</span><br>
      <span class="sub-text">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</span>
    `;
  }

  if (el('editPatientName')) el('editPatientName').value = patient.name || '';
  if (el('editPatientEmail')) el('editPatientEmail').value = patient.email || '';
  if (el('editPatientPhone')) el('editPatientPhone').value = patient.phone || '';
  if (el('editPatientCondition')) el('editPatientCondition').value = patient.condition || '';
  if (el('editPatientDiagnosis')) el('editPatientDiagnosis').value = patient.diagnosis || '';
}

async function savePatientRecord() {
  const patient = patients.find((p) => p.id === selectedPatientId);
  if (!patient) return;

  const updated = {
    ...patient,
    name: el('editPatientName')?.value.trim() || patient.name,
    email: el('editPatientEmail')?.value.trim() || null,
    phone: el('editPatientPhone')?.value.trim() || patient.phone,
    condition: el('editPatientCondition')?.value.trim() || patient.condition,
    diagnosis: el('editPatientDiagnosis')?.value.trim() || patient.diagnosis
  };

  await apiFetch(`/patients/${patient.id}`, {
    method: 'PATCH',
    body: JSON.stringify(updated)
  });

  await loadAll();
  selectedPatientId = patient.id;
  renderRecordDetails();
}

async function submitNewPatient() {
  const newPatient = {
    name: el('addName')?.value.trim(),
    email: el('addEmail')?.value.trim() || null,
    phone: el('addPhone')?.value.trim() || 'N/A',
    condition: el('addCondition')?.value.trim() || 'General',
    diagnosis: el('addDiagnosis')?.value.trim() || 'Pending assessment'
  };

  if (!newPatient.name) return;

  const created = await apiFetch('/patients', {
    method: 'POST',
    body: JSON.stringify(newPatient)
  });

  selectedPatientId = created.id;
  await loadAll();
  showSection('patients');
}

async function deletePatient(id) {
  const confirmed = confirm('Delete this patient?');
  if (!confirmed) return;

  await apiFetch(`/patients/${id}`, {
    method: 'DELETE'
  });

  if (selectedPatientId === id) {
    selectedPatientId = null;
  }

  await loadAll();

  if (!selectedPatientId && patients.length) {
    selectedPatientId = patients[0].id;
    renderRecordDetails();
  }
}

function renderBilling() {
  if (el('billingPatient')) {
    el('billingPatient').innerHTML = patients.map((p) =>
      `<option value="${p.id}">${p.id}</option>`
    ).join('');
  }

  if (el('billingTable')) {
    el('billingTable').innerHTML = bills.map((b) => `
      <tr>
        <td>${b.invoice || ''}</td>
        <td>${b.amount || ''}</td>
      </tr>
    `).join('');
  }
}

async function addBill() {
  const patientId = el('billingPatient')?.value;
  const patient = patients.find((p) => p.id === patientId);
  const invoice = el('billingInvoice')?.value.trim();
  const amount = el('billingAmount')?.value;

  if (!patient || !invoice || !amount) return;

  await apiFetch('/billing/invoices', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      patientName: patient.name,
      invoice,
      amount
    })
  });

  el('billingInvoice').value = '';
  el('billingAmount').value = '';
  await loadAll();
}

function renderNotifications() {
  if (el('notificationPatient')) {
    el('notificationPatient').innerHTML = patients.map((p) =>
      `<option value="${p.id}">${p.id}</option>`
    ).join('');
  }

  if (el('notificationTable')) {
    el('notificationTable').innerHTML = notifications.map((n) => `
      <tr>
        <td>${n.patientName || ''}</td>
        <td>${n.type || ''}</td>
        <td>${n.message || ''}</td>
        <td>${n.status || ''}</td>
      </tr>
    `).join('');
  }
}

async function sendNotification() {
  const patientId = el('notificationPatient')?.value;
  const patient = patients.find((p) => p.id === patientId);
  const message = el('notificationMessage')?.value.trim();

  if (!patient || !message) return;

  await apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      patientName: patient.name,
      message
    })
  });

  if (el('notificationMessage')) el('notificationMessage').value = '';
  await loadAll();
}

async function sendEmailNotification() {
  const patientId = el('notificationPatient')?.value;
  const patient = patients.find((p) => p.id === patientId);
  const subject = el('notificationSubject')?.value.trim() || 'Healthcare Notification';
  const message = el('notificationMessage')?.value.trim();

  if (!patient || !message) return;

  await apiFetch('/email/send', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      subject,
      message
    })
  });

  if (el('notificationSubject')) el('notificationSubject').value = '';
  if (el('notificationMessage')) el('notificationMessage').value = '';
  await loadAll();
}

async function addAppointment() {
  const patientName = el('appointmentPatient')?.value.trim();
  const appointmentDate = el('appointmentDate')?.value;

  if (!patientName || !appointmentDate) return;

  await apiFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientName,
      appointmentDate,
      status: 'Scheduled'
    })
  });

  const patient = patients.find((p) => p.name.toLowerCase() === patientName.toLowerCase());

  if (patient && patient.email) {
    try {
      await apiFetch('/email/send', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id,
          subject: 'Appointment Confirmed',
          message: `Hello ${patient.name}, your appointment is scheduled for ${appointmentDate}.`
        })
      });
    } catch {}
  }

  if (el('appointmentPatient')) el('appointmentPatient').value = '';
  if (el('appointmentDate')) el('appointmentDate').value = '';
  await loadAll();
}

loadAll().catch((error) => {
  console.error(error);
  alert('Failed to load admin data. Check backend connection.');
});
