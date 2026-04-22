const API = 'https://etr-backend.onrender.com/api';

const currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');
let patients = JSON.parse(localStorage.getItem('patients') || '[]');
let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
let doctorCalendar = null;
let selectedCalendarDate = new Date().toISOString().split('T')[0];

if (!currentUser || currentUser.role !== 'doctor') {
  window.location.href = 'index.html';
}

function el(id) {
  return document.getElementById(id);
}

function logout() {
  localStorage.removeItem('healthcare_user');
  window.location.href = 'index.html';
}

function showSection(id, btn = null) {
  document.querySelectorAll('main section').forEach((section) => {
    section.classList.add('hidden');
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach((nav) => {
    nav.classList.remove('active');
  });

  if (btn) btn.classList.add('active');

  if (id === 'dashboard') {
    renderTodayAppointments();
  }

  if (id === 'appointments') {
    setTimeout(() => {
      initDoctorCalendar();
      renderAppointmentsPage();
    }, 50);
  }

  if (id === 'patients') {
    renderPatients();
  }
}

function getStatus(patient) {
  if (!patient.diagnosis) return { label: 'Pending', class: 'pending' };

  const text = String(patient.diagnosis).toLowerCase();

  if (text.includes('critical') || text.includes('pneumonia') || text.includes('emergency')) {
    return { label: 'Critical', class: 'critical' };
  }

  if (text.includes('follow') || text.includes('check') || text.includes('hypertension')) {
    return { label: 'Follow-up', class: 'warning' };
  }

  return { label: 'Stable', class: 'stable' };
}

function getDatePart(value) {
  const raw = String(value || '');
  return raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
}

function getTimePart(value) {
  const raw = String(value || '');
  if (raw.includes('T')) return raw.split('T')[1].slice(0, 5);
  if (raw.includes(' ')) return raw.split(' ')[1] || '';
  return raw;
}

function getHour(value) {
  const match = getTimePart(value).match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : null;
}

function renderSlot(containerId, items, allowDone = false) {
  const container = el(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="sub-text">No appointments</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="appt-item">
      <div class="appt-time">${getTimePart(item.appointmentDate)}</div>
      <div class="appt-main">
        <strong>${item.patientName}</strong>
        <div class="appt-meta">${item.status}</div>
      </div>
      <div>
        ${allowDone && item.status !== 'Done'
          ? `<button class="btn btn-primary small-btn" onclick="markAppointmentDone(${item.id})">Done</button>`
          : `<span class="status ${String(item.status).toLowerCase() === 'done' ? 'done' : 'scheduled'}">${item.status}</span>`
        }
      </div>
    </div>
  `).join('');
}

function renderTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const items = appointments.filter((appointment) => getDatePart(appointment.appointmentDate) === today);

  const morning = items.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour < 12;
  });

  const afternoon = items.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour >= 12;
  });

  renderSlot('todayMorningAppointmentList', morning);
  renderSlot('todayAfternoonAppointmentList', afternoon);
}

function buildDoctorCalendarEvents() {
  const grouped = {};

  appointments.forEach((appointment) => {
    const date = getDatePart(appointment.appointmentDate);
    if (!grouped[date]) {
      grouped[date] = 0;
    }
    grouped[date] += 1;
  });

  return Object.keys(grouped).map((date) => ({
    title: `${grouped[date]} patient${grouped[date] > 1 ? 's' : ''}`,
    start: date,
    allDay: true
  }));
}

function initDoctorCalendar() {
  const calendarEl = document.getElementById('doctorCalendar');
  if (!calendarEl || typeof FullCalendar === 'undefined') return;

  if (doctorCalendar) {
    doctorCalendar.destroy();
  }

  doctorCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: appointments.map((a) => ({
      title: a.patientName,
      start: a.appointmentDate
    })),
    dateClick: function(info) {
      const input = document.getElementById('selectedDate');
      if (input) {
        input.value = info.dateStr;
      }
      renderAppointmentsPage();
    },
    eventClick: function(info) {
      const clickedDate = info.event.startStr.split('T')[0];
      const input = document.getElementById('selectedDate');
      if (input) {
        input.value = clickedDate;
      }
      renderAppointmentsPage();
    }
  });

  doctorCalendar.render();
}

function renderAppointmentsPage() {
  const date = el('selectedDate')?.value || new Date().toISOString().split('T')[0];
  const search = String(el('appointmentSearch')?.value || '').toLowerCase();

  const items = appointments.filter((appointment) => {
    return (
      getDatePart(appointment.appointmentDate) === date &&
      [appointment.patientName, appointment.appointmentDate, appointment.status]
        .some((value) => String(value || '').toLowerCase().includes(search))
    );
  });

  const morning = items.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour < 12;
  });

  const afternoon = items.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour >= 12;
  });

  renderSlot('selectedMorningAppointmentList', morning, true);
  renderSlot('selectedAfternoonAppointmentList', afternoon, true);

  if (el('appointmentTable')) {
    el('appointmentTable').innerHTML = items.map((appointment) => `
      <tr>
        <td>${appointment.patientName}</td>
        <td>${appointment.appointmentDate}</td>
        <td>${appointment.status}</td>
        <td>
          ${appointment.status !== 'Done'
            ? `<button class="btn btn-primary small-btn" onclick="markAppointmentDone(${appointment.id})">Done</button>`
            : ''
          }
        </td>
      </tr>
    `).join('');
  }
}

function openPatient(id) {
  alert('Patient ID: ' + id);
}

function renderPatients() {
  const table = el('patientTable');
  if (!table) return;

  const search = String(el('patientSearch')?.value || '').toLowerCase();

  const filtered = patients.filter((patient) =>
    [patient.name, patient.email, patient.phone, patient.condition, patient.diagnosis]
      .some((value) => String(value || '').toLowerCase().includes(search))
  );

  table.innerHTML = filtered.map((patient) => {
    const status = getStatus(patient);

    return `
      <tr class="patient-row">
        <td>
          <strong>${patient.name}</strong><br>
          <span class="sub-text">${patient.email || 'No email'}</span>
        </td>
        <td>${patient.phone || 'N/A'}</td>
        <td>${patient.condition || 'General'}</td>
        <td>
          <span class="badge ${status.class}">${status.label}</span><br>
          <span class="sub-text">${patient.diagnosis || 'Pending assessment'}</span>
        </td>
        <td>
          <button class="btn btn-secondary small-btn" onclick="openPatient(${patient.id})">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

function markAppointmentDone(id) {
  const appointment = appointments.find((item) => Number(item.id) === Number(id));
  if (!appointment) return;

  appointment.status = 'Done';
  localStorage.setItem('appointments', JSON.stringify(appointments));

  renderTodayAppointments();
  renderAppointmentsPage();
  initDoctorCalendar();
}

function renderAll() {
  el('welcomeText').innerText = `Welcome, ${currentUser.email}`;

  if (el('selectedDate') && !el('selectedDate').value) {
    el('selectedDate').value = new Date().toISOString().split('T')[0];
  }

  renderTodayAppointments();
  renderAppointmentsPage();
  renderPatients();
  initDoctorCalendar();
}

renderAll();
