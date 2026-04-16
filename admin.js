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

function showSection(id) {
  document.querySelectorAll('section').forEach((section) => section.classList.add('hidden'));
  const target = el(id);
  if (target) target.classList.remove('hidden');
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
  render();
}

function render() {
  el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  el('patientCount').innerText = patients.length;
  el('appointmentCount').innerText = appointments.length;
  el('billCount').innerText = bills.length;

  if (!selectedPatientId && patients.length) {
    selectedPatientId = patients[0].id;
  }

  renderAppointments();
  renderPatients();
  renderBilling();
  renderNotifications();
  renderRecordDetails();
}

function renderAppointments() {
  el('appointmentTable').innerHTML = appointments.map((a) =>
    `<tr><td>${a.patientName}</td><td>${a.appointmentDate}</td><td>${a.status || 'Scheduled'}</td></tr>`
  ).join('');
}

function renderPatients() {
  const search = (el('patientSearch').value || '').toLowerCase();
  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search) || (p.condition || '').toLowerCase().includes(search)
  );

  el('patientList').innerHTML = filtered.map((p) => `
    <button class="list-item patient-button" onclick="openPatientRecord('${p.id}')">
      <strong>${p.name}</strong>
      <div class="muted">${p.condition || 'General'}</div>
    </button>
  `).join('');
}

function renderRecordDetails() {
  const patient = patients.find((p) => p.id === selectedPatientId);
  if (!patient) return;

  el('recordDetails').innerHTML = `
    <strong>${patient.name}</strong>
    <div class="muted">ID: ${patient.id}</div>
    <div class="muted">Phone: ${patient.phone || 'N/A'}</div>
    <div class="muted">Condition: ${patient.condition || 'General'}</div>
    <div class="muted">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</div>
  `;

  el('editPatientName').value = patient.name || '';
  el('editPatientPhone').value = patient.phone || '';
  el('editPatientCondition').value = patient.condition || '';
  el('editPatientDiagnosis').value = patient.diagnosis || '';
}

function openPatientRecord(id) {
  selectedPatientId = id;
  showSection('patients');
  renderRecordDetails();
}

async function savePatientRecord() {
  const patient = patients.find((p) => p.id === selectedPatientId);
  if (!patient) return;

  const updated = {
    ...patient,
    name: el('editPatientName').value.trim() || patient.name,
    phone: el('editPatientPhone').value.trim() || patient.phone,
    condition: el('editPatientCondition').value.trim() || patient.condition,
    diagnosis: el('editPatientDiagnosis').value.trim() || patient.diagnosis
  };

  await apiFetch(`/patients/${patient.id}`, {
    method: 'PATCH',
    body: JSON.stringify(updated)
  });

  await loadAll();
}

async function submitNewPatient() {
  const newPatient = {
    name: el('addName').value.trim(),
    phone: el('addPhone').value.trim() || 'N/A',
    condition: el('addCondition').value.trim() || 'General',
    diagnosis: el('addDiagnosis').value.trim() || 'Pending assessment'
  };

  if (!newPatient.name) return;

  await apiFetch('/patients', {
    method: 'POST',
    body: JSON.stringify(newPatient)
  });

  showSection('patients');
  await loadAll();
}

async function addAppointment() {
  const patientName = el('appointmentPatient').value.trim();
  const appointmentDate = el('appointmentDate').value;
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
  if (patient) {
    await apiFetch('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id,
        patientName: patient.name,
        message: `Your appointment is confirmed for ${appointmentDate}.`
      })
    });
  }

  el('appointmentPatient').value = '';
  el('appointmentDate').value = '';
  await loadAll();
}

function renderBilling() {
  el('billingPatient').innerHTML = patients.map((p) =>
    `<option value="${p.id}">${p.id}</option>`
  ).join('');

  el('billingTable').innerHTML = bills.map((b) =>
    `<tr><td>${b.invoice}</td><td>${b.amount}</td></tr>`
  ).join('');
}

async function addBill() {
  const patientId = el('billingPatient').value;
  const patient = patients.find((p) => p.id === patientId);
  const invoice = el('billingInvoice').value.trim();
  const amount = el('billingAmount').value;
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

  await apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      patientName: patient.name,
      message: `A new bill (${invoice}) for amount ${amount} has been added to your account.`
    })
  });

  el('billingInvoice').value = '';
  el('billingAmount').value = '';
  await loadAll();
}

function renderNotifications() {
  el('notificationPatient').innerHTML = patients.map((p) =>
    `<option value="${p.id}">${p.id}</option>`
  ).join('');

  el('notificationTable').innerHTML = notifications.map((n) =>
    `<tr><td>${n.patientName}</td><td>${n.type}</td><td>${n.message}</td><td>${n.status}</td></tr>`
  ).join('');
}

async function sendNotification() {
  const patientId = el('notificationPatient').value;
  const patient = patients.find((p) => p.id === patientId);
  const message = el('notificationMessage').value.trim();
  if (!patient || !message) return;

  await apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      patientName: patient.name,
      message
    })
  });

  el('notificationMessage').value = '';
  await loadAll();
}

loadAll().catch(() => {
  alert('Failed to load database data. Check backend connection.');
});
