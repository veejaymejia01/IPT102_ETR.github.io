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

function showSection(id, btn = null) {
  document.querySelectorAll('main section').forEach((section) => {
    section.classList.add('hidden');
  });

  const target = el(id);
  if (target) {
    target.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-btn').forEach((nav) => {
    nav.classList.remove('active');
  });

  if (btn) {
    btn.classList.add('active');
  }

  if (id === 'appointments') {
    renderSelectedDayAppointments();
    if (calendar) {
      setTimeout(() => calendar.updateSize(), 50);
    }
  }

  if (id === 'patients') {
    renderPatients();
    renderRecordDetails();
  }

  if (id === 'dashboard') {
    renderTodayAppointments();
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

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function getDatePart(item) {
  const raw = String(item.appointmentDate || '');
  if (!raw) return '';
  return raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
}
function getTimePart(item) {
  const raw = String(item.appointmentDate || '');
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[1].slice(0, 5);
  if (raw.includes(' ')) return raw.split(' ')[1] || '';
  return raw;
}

function getHour(item) {
  const time = getTimePart(item);
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : null;
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
  const today = getTodayDateString();
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
  const search = (el('appointmentSearch')?.value || '').toLowerCase();

  const selectedAppointments = appointments.filter((a) => {
    const sameDay = getDatePart(a) === selectedDate;
    const patient = String(a.patientName || '').toLowerCase();
    const date = String(a.appointmentDate || '').toLowerCase();
    const status = String(a.status || '').toLowerCase();

    return sameDay && (
      patient.includes(search) ||
      date.includes(search) ||
      status.includes(search)
    );
  });

  const morning = selectedAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour < 12;
  });

  const afternoon = selectedAppointments.filter((a) => {
    const hour = getHour(a);
    return hour !== null && hour >= 12;
  });

  if (el('selectedDateTitle')) {
    el('selectedDateTitle').innerText = `Patient Schedule for ${selectedDate}`;
  }

  renderPatientScheduleList('selectedMorningAppointmentList', morning);
  renderPatientScheduleList('selectedAfternoonAppointmentList', afternoon);

  const table = el('appointmentTable');
  if (table) {
    table.innerHTML = selectedAppointments.map((a) => `
      <tr>
        <td>${a.patientName}</td>
        <td>${getTimePart(a)}</td>
        <td>${a.status || 'Scheduled'}</td>
      </tr>
    `).join('');
  }
}

function renderPatientScheduleList(containerId, items) {
  const container = el(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="muted">No patients scheduled</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>${item.patientName}</strong>
      <div class="muted">Time: ${getTimePart(item)}</div>
      <div class="${item.status === 'Done' ? 'badge status-done' : 'badge'}" style="margin-top:8px">
        ${item.status || 'Scheduled'}
      </div>
      ${item.status !== 'Done'
        ? `<button class="action" style="margin-top:8px" onclick="markAppointmentDone('${item.id}')">Done</button>`
        : ''}
    </div>
  `).join('');
}

function buildCalendarEvents() {
  const grouped = {};

  appointments.forEach((a) => {
    const date = getDatePart(a);
    if (!grouped[date]) grouped[date] = 0;
    grouped[date] += 1;
  });

  return Object.keys(grouped).map((date) => {
    const count = grouped[date];
    return {
      title: `${count} patient${count > 1 ? 's' : ''}`,
      date
    };
  });
}

function highlightSelectedDate() {
  const today = getTodayDateString();

  document.querySelectorAll('.fc-daygrid-day').forEach((day) => {
    day.classList.remove('selected-day');
    day.classList.remove('today-day');
    day.classList.remove('past-day');
  });

  document.querySelectorAll('.fc-daygrid-day').forEach((day) => {
    const dateStr = day.getAttribute('data-date');
    if (!dateStr) return;

    if (dateStr < today) {
      day.classList.add('past-day');
      return;
    }

    if (dateStr === today) {
      day.classList.add('today-day');
    }

    if (dateStr === selectedDate) {
      day.classList.add('selected-day');
    }
  });
}

function initCalendar() {
  const calendarEl = el('calendar');
  if (!calendarEl || typeof FullCalendar === 'undefined') return;

  if (calendar) {
    calendar.destroy();
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    customButtons: {},
    events: buildCalendarEvents(),

    dateClick(info) {
      selectedDate = info.dateStr;
      renderSelectedDayAppointments();
      setTimeout(() => highlightSelectedDate(), 0);
    },

    datesSet() {
      setTimeout(() => highlightSelectedDate(), 0);
    },

    dayCellDidMount() {
      setTimeout(() => highlightSelectedDate(), 0);
    }
  });

  calendar.render();

  const todayBtn = calendarEl.querySelector('.fc-today-button');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      selectedDate = getTodayDateString();
      renderSelectedDayAppointments();
      setTimeout(() => highlightSelectedDate(), 0);
    });
  }
}

function renderPatients() {
  const search = (el('patientSearch')?.value || '').toLowerCase();
  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search) ||
    (p.condition || '').toLowerCase().includes(search)
  );

  if (el('patientList')) {
    el('patientList').innerHTML = filtered.map((p) => `
      <button class="list-item patient-button" onclick="openPatientRecord('${p.id}')">
        <strong>${p.name}</strong>
        <div class="muted">${p.condition || 'General'}</div>
      </button>
    `).join('');
  }
}

function openPatientRecord(id) {
  selectedPatientId = id;
  showSection('patients');
  renderRecordDetails();
}

function renderRecordDetails() {
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  if (!patient) return;

  if (el('recordDetails')) {
    el('recordDetails').innerHTML = `
      <strong>${patient.name}</strong>
      <div class="muted">ID: ${patient.id}</div>
      <div class="muted">Phone: ${patient.phone || 'N/A'}</div>
      <div class="muted">Condition: ${patient.condition || 'General'}</div>
      <div class="muted">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</div>
    `;
  }

  if (el('editPatientName')) el('editPatientName').value = patient.name || '';
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
    phone: el('editPatientPhone')?.value.trim() || patient.phone,
    condition: el('editPatientCondition')?.value.trim() || patient.condition,
    diagnosis: el('editPatientDiagnosis')?.value.trim() || patient.diagnosis
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
  if (el('welcomeText')) {
    el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  }

  renderTodayAppointments();
  renderPatients();
  renderRecordDetails();
  initCalendar();
  renderSelectedDayAppointments();
  setTimeout(() => highlightSelectedDate(), 100);
}

loadAll().catch((error) => {
  console.error(error);
  alert('Failed to load doctor data. Check backend connection or doctor.js errors.');
});
