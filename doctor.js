const API = 'https://etr-backend.onrender.com/api';


const token = localStorage.getItem('healthcare_token') || '';
const currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');

let patients = [];
let appointments = [];
let selectedPatientId = null;
let selectedDate = new Date().toISOString().split('T')[0];
let calendar = null;

if (!currentUser || currentUser.role !== 'doctor' || !token) {
  window.location.href = 'index.html';
}

function el(id) {
  return document.getElementById(id);
}

function showSection(id) {
  document.querySelectorAll('section').forEach((section) => section.classList.add('hidden'));
  const target = el(id);
  if (target) target.classList.remove('hidden');

  if (id === 'appointments' && calendar) {
    setTimeout(() => calendar.updateSize(), 50);
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
  render();
}

function getHour(item) {
  const raw = String(item.appointmentDate || '');
  const match = raw.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : null;
}

function getDatePart(item) {
  return String(item.appointmentDate || '').split(' ')[0];
}

function renderSlot(containerId, items, showDoneButton = false) {
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
      <div class="${item.status === 'Done' ? 'badge status-done' : 'badge'}" style="margin-top:8px">
        ${item.status || 'Scheduled'}
      </div>
      ${showDoneButton && item.status !== 'Done'
        ? `<button class="action" style="margin-top:8px" onclick="markAppointmentDone('${item.id}')">Done</button>`
        : ''}
    </div>
  `).join('');
}

function renderTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => getDatePart(a) === today);

  const morning = todayAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour < 12;
  });

  const afternoon = todayAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour >= 12;
  });

  renderSlot('todayMorningAppointmentList', morning, false);
  renderSlot('todayAfternoonAppointmentList', afternoon, false);
}

function renderSelectedDayAppointments() {
  const search = (el('appointmentSearch').value || '').toLowerCase();

  const selectedAppointments = appointments.filter((a) => {
    const sameDay = getDatePart(a) === selectedDate;
    const patient = String(a.patientName || '').toLowerCase();
    const date = String(a.appointmentDate || '').toLowerCase();
    const status = String(a.status || '').toLowerCase();
    const matchesSearch = patient.includes(search) || date.includes(search) || status.includes(search);
    return sameDay && matchesSearch;
  });

  const morning = selectedAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour < 12;
  });

  const afternoon = selectedAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour >= 12;
  });

  el('selectedDateTitle').innerText = `Schedule for ${selectedDate}`;
  renderSlot('selectedMorningAppointmentList', morning, true);
  renderSlot('selectedAfternoonAppointmentList', afternoon, true);

  el('appointmentTable').innerHTML = selectedAppointments.map((a) =>
    `<tr><td>${a.patientName}</td><td>${a.appointmentDate}</td><td>${a.status}</td></tr>`
  ).join('');
}

function buildCalendarEvents() {
  return appointments.map((a) => ({
    id: a.id,
    title: `${a.patientName} (${a.status || 'Scheduled'})`,
    date: getDatePart(a)
  }));
}

function initCalendar() {
  const calendarEl = el('calendar');
  if (!calendarEl) return;

  if (calendar) {
    calendar.destroy();
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: 'dayGridMonth',
  height: 'auto',
  events: buildCalendarEvents(),

  dateClick(info) {
    selectedDate = info.dateStr;
    highlightSelectedDate();
    renderSelectedDayAppointments();
  },

  dayCellDidMount(info) {
    if (info.dateStr === selectedDate) {
      info.el.classList.add('selected-day');
    }
  }
});

  calendar.render();
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

function openPatientRecord(id) {
  selectedPatientId = id;
  showSection('patients');
  renderRecordDetails();
}

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

  await apiFetch(`/patients/${patient.id}`, {
    method: 'PATCH',
    body: JSON.stringify(updated)
  });

  await loadAll();
}

async function markAppointmentDone(id) {
  await apiFetch(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'Done' })
  });

  await loadAll();
}

function render() {
  el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  renderTodayAppointments();
  renderPatients();
  renderRecordDetails();
  initCalendar();
  renderSelectedDayAppointments();
  setTimeout(() => highlightSelectedDate(), 100);
}

loadAll().catch(() => {
  alert('Failed to load database data. Check backend connection.');
});

function highlightSelectedDate() {
  // remove old highlight
  document.querySelectorAll('.fc-daygrid-day').forEach(day => {
    day.classList.remove('selected-day');
  });

  // add highlight to selected date
  const target = document.querySelector(`[data-date="${selectedDate}"]`);
  if (target) {
    target.classList.add('selected-day');
  }
}
