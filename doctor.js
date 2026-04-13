const API = 'http://localhost:3000/api';
const token = localStorage.getItem('healthcare_token') || '';
const currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');

let patients = [];
let appointments = [];
let selectedPatientId = null;

if (!currentUser || currentUser.role !== 'doctor') {
  window.location.href = 'login.html';
}

function el(id) { return document.getElementById(id); }
function showSection(id) {
  document.querySelectorAll('section').forEach((section) => section.classList.add('hidden'));
  const target = el(id);
  if (target) target.classList.remove('hidden');
}
function logout() {
  localStorage.removeItem('healthcare_token');
  localStorage.removeItem('healthcare_user');
  window.location.href = 'login.html';
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

function loadDemoData() {
  const today = new Date().toISOString().split('T')[0];
  patients = [
    { id: 'P1001', name: 'Maria Santos', phone: '09171234567', condition: 'Hypertension', diagnosis: 'Stage 1 hypertension' },
    { id: 'P1002', name: 'John Reyes', phone: '09179876543', condition: 'Dermatitis', diagnosis: 'Skin inflammation' },
    { id: 'P1003', name: 'Ana Cruz', phone: '09170001111', condition: 'Checkup', diagnosis: 'Routine follow-up' }
  ];
  appointments = [
    { id: 'A1001', patientName: 'Maria Santos', appointmentDate: `${today} 09:00`, status: 'Scheduled' },
    { id: 'A1002', patientName: 'John Reyes', appointmentDate: `${today} 11:30`, status: 'Scheduled' },
    { id: 'A1003', patientName: 'Ana Cruz', appointmentDate: `${today} 14:00`, status: 'Done' }
  ];
}

async function loadAll() {
  if (token === 'demo-token') { loadDemoData(); render(); return; }
  try { patients = await apiFetch('/patients'); } catch { patients = []; }
  try { appointments = await apiFetch('/appointments'); } catch { appointments = []; }
  render();
}

function getHour(item) {
  const raw = String(item.appointmentDate || '');
  const match = raw.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : null;
}

function renderSlot(containerId, items) {
  const container = el(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="muted">No appointments</div>';
    return;
  }
  container.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>${item.patientName}</strong>
      <div class="muted">${item.appointmentDate}</div>
      <div class="${item.status === 'Done' ? 'badge status-done' : 'badge'}" style="margin-top:8px">${item.status || 'Scheduled'}</div>
      ${item.status !== 'Done' ? `<button class="action" style="margin-top:8px" onclick="markAppointmentDone('${item.id}')">Done</button>` : ''}
    </div>
  `).join('');
}

function renderTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => String(a.appointmentDate).includes(today));
  const morning = todayAppointments.filter((a) => { const hour = getHour(a); return hour !== null && hour < 12; });
  const afternoon = todayAppointments.filter((a) => { const hour = getHour(a); return hour !== null && hour >= 12; });
  renderSlot('todayMorningAppointmentList', morning);
  renderSlot('todayAfternoonAppointmentList', afternoon);
}

function renderAppointments() {
  const search = (el('appointmentSearch').value || '').toLowerCase();
  const filtered = appointments.filter((a) => {
    const patient = String(a.patientName || '').toLowerCase();
    const date = String(a.appointmentDate || '').toLowerCase();
    const status = String(a.status || '').toLowerCase();
    return patient.includes(search) || date.includes(search) || status.includes(search);
  });
  const morning = filtered.filter((a) => { const hour = getHour(a); return hour !== null && hour < 12; });
  const afternoon = filtered.filter((a) => { const hour = getHour(a); return hour !== null && hour >= 12; });
  renderSlot('appointmentMorningList', morning);
  renderSlot('appointmentAfternoonList', afternoon);
  el('appointmentTable').innerHTML = filtered.map((a) => `<tr><td>${a.patientName}</td><td>${a.appointmentDate}</td><td>${a.status}</td></tr>`).join('');
  el('appointmentTotalMetric').innerText = filtered.length;
  el('appointmentTodayMetric').innerText = filtered.filter((a) => String(a.appointmentDate).includes(new Date().toISOString().split('T')[0])).length;
  el('appointmentDoneMetric').innerText = filtered.filter((a) => a.status === 'Done').length;
}

async function markAppointmentDone(id) {
  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) return;
  appointment.status = 'Done';
  if (token !== 'demo-token') {
    try { await apiFetch(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Done' }) }); } catch {}
  }
  render();
}

function renderPatients() {
  const search = (el('patientSearch').value || '').toLowerCase();
  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search) || (p.condition || '').toLowerCase().includes(search));
  el('patientList').innerHTML = filtered.map((p) => `
    <button class="list-item patient-button" onclick="openPatientRecord('${p.id}')">
      <strong>${p.name}</strong>
      <div class="muted">${p.condition || 'General'}</div>
    </button>
  `).join('');
}

function openPatientRecord(id) { selectedPatientId = id; showSection('patients'); renderRecordDetails(); }

function renderRecordDetails() {
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
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
  if (token !== 'demo-token') {
    try { await apiFetch(`/patients/${patient.id}`, { method: 'PATCH', body: JSON.stringify(updated) }); } catch {}
  }
  patients = patients.map((p) => (p.id === patient.id ? updated : p));
  render();
}

function render() {
  el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  renderTodayAppointments();
  renderAppointments();
  renderPatients();
  renderRecordDetails();
}

loadAll();
