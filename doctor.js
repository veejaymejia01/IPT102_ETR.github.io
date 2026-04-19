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
    renderTodayAppointments();
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

  if (!selectedPatientId && patients.length) {
    selectedPatientId = patients[0].id;
  }

  renderAll();
}

function renderAll() {
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
    container.innerHTML = '<div class="sub-text">No appointments</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="appt-item">
      <div class="appt-time">${getTimePart(item)}</div>
      <div class="appt-main">
        <strong>${item.patientName}</strong>
        <div class="appt-meta">${item.status || 'Scheduled'}</div>
      </div>
      <div>
        ${showDoneButton && item.status !== 'Done'
          ? `<button class="btn btn-primary inline-btn" onclick="markAppointmentDone('${item.id}')">Done</button>`
          : `<span class="status ${String(item.status || '').toLowerCase() === 'done' ? 'done' : 'scheduled'}">${item.status || 'Scheduled'}</span>`}
      </div>
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

function renderPatientScheduleList(containerId, items) {
  const container = el(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="sub-text">No patients scheduled</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="appt-item">
      <div class="appt-time">${getTimePart(item)}</div>
      <div class="appt-main">
        <strong>${item.patientName}</strong>
        <div class="appt-meta">${item.status || 'Scheduled'}</div>
      </div>
      <div>
        ${item.status !== 'Done'
          ? `<button class="btn btn-primary inline-btn" onclick="markAppointmentDone('${item.id}')">Done</button>`
          : `<span class="status done">Done</span>`}
      </div>
    </div>
  `).join('');
}

function renderSelectedDayAppointments() {
  const search = String(el('appointmentSearch')?.value || '').toLowerCase();

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

  if (el('appointmentTable')) {
    el('appointmentTable').innerHTML = selectedAppointments.map((a) => `
      <tr>
        <td>${a.patientName}</td>
        <td>${getTimePart(a)}</td>
        <td>${a.status || 'Scheduled'}</td>
      </tr>
    `).join('');
  }
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

function goToTodaySchedule() {
  selectedDate = getTodayDateString();
  renderSelectedDayAppointments();

  if (calendar) {
    calendar.today();
    setTimeout(() => highlightSelectedDate(), 0);
  }
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
  const list = el('patientList');
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

  if (table) {
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
              Open
            </button>
          </td>
        </tr>
      `;
    }).join('');
    return;
  }

  if (list) {
    list.innerHTML = filtered.map((patient) => {
      const status = getStatus(patient);

      return `
        <div class="patient-card">
          <div onclick="selectPatient('${patient.id}')" style="cursor:pointer; flex:1;">
            <strong>${patient.name || ''}</strong>
            <div class="patient-meta">${patient.email || 'No email'} · ${patient.phone || 'N/A'}</div>
            <div class="patient-meta">${patient.condition || 'General'} · ${patient.diagnosis || 'Pending assessment'}</div>
            <div style="margin-top:8px;">
              <span class="badge ${status.class}">${status.label}</span>
            </div>
          </div>
          <button class="btn btn-secondary inline-btn" onclick="selectPatient('${patient.id}')">Open</button>
        </div>
      `;
    }).join('');
  }
}

function selectPatient(id) {
  selectedPatientId = id;
  renderRecordDetails();
}

function renderRecordDetails() {
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  if (!patient) return;

  selectedPatientId = patient.id;

  if (el('recordDetails')) {
    el('recordDetails').innerHTML = `
      <strong>${patient.name || ''}</strong><br>
      <span class="sub-text">ID: ${patient.id || ''}</span><br>
      <span class="sub-text">Email: ${patient.email || 'No email'}</span><br>
      <span class="sub-text">Phone: ${patient.phone || 'N/A'}</span><br>
      <span class="sub-text">Condition: ${patient.condition || 'General'}</span><br>
      <span class="sub-text">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</span>
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
    email: patient.email || null,
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

loadAll().catch((error) => {
  console.error(error);
  alert('Failed to load doctor data. Check backend connection.');
});
