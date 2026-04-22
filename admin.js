let patients = JSON.parse(localStorage.getItem('patients') || '[]');
let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
let bills = JSON.parse(localStorage.getItem('bills') || '[]');
let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
let selectedPatientId = null;
let adminCalendar = null;

const currentUser = JSON.parse(localStorage.getItem('healthcare_user') || 'null');

if (!currentUser || currentUser.role !== 'admin') {
  window.location.href = 'index.html';
}

function el(id) {
  return document.getElementById(id);
}

function saveAll() {
  localStorage.setItem('patients', JSON.stringify(patients));
  localStorage.setItem('appointments', JSON.stringify(appointments));
  localStorage.setItem('bills', JSON.stringify(bills));
  localStorage.setItem('notifications', JSON.stringify(notifications));
}

function logout() {
  localStorage.removeItem('healthcare_user');
  window.location.href = 'index.html';
}

function showSection(id, btn = null) {
  document.querySelectorAll('main section').forEach((section) => {
    section.classList.add('hidden');
  });

  const target = el(id);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach((nav) => {
    nav.classList.remove('active');
  });

  if (btn) btn.classList.add('active');

  if (id === 'appointments') {
    renderAdminAppointmentsPage();
    initAdminCalendar();
  }

  if (id === 'patients') {
    renderPatients();
    renderRecordDetails();
  }

  if (id === 'billing') {
    renderBilling();
  }

  if (id === 'notifications') {
    renderNotifications();
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
  const match = getTimePart(value).match(/(\\d{2}):(\\d{2})/);
  return match ? Number(match[1]) : null;
}

function renderSlot(containerId, items) {
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
        <span class="status ${String(item.status).toLowerCase() === 'done' ? 'done' : 'scheduled'}">
          ${item.status}
        </span>
      </div>
    </div>
  `).join('');
}

function buildCalendarEvents() {
  return appointments.map((appointment) => ({
    title: appointment.patientName,
    start: appointment.appointmentDate
  }));
}

function initAdminCalendar() {
  const calendarEl = el('adminCalendar');
  if (!calendarEl || typeof FullCalendar === 'undefined') return;

  if (adminCalendar) {
    adminCalendar.destroy();
  }

  adminCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: buildCalendarEvents(),
    dateClick(info) {
      if (el('adminSelectedDate')) {
        el('adminSelectedDate').value = info.dateStr;
      }
      renderAdminAppointmentsPage();
    }
  });

  adminCalendar.render();
}

function refreshCalendar() {
  if (adminCalendar) {
    adminCalendar.removeAllEvents();
    buildCalendarEvents().forEach((event) => adminCalendar.addEvent(event));
  }
}

function renderAdminAppointmentsPage() {
  const selectedDate = el('adminSelectedDate')?.value || new Date().toISOString().split('T')[0];
  const search = String(el('appointmentSearch')?.value || '').toLowerCase();

  const filtered = appointments.filter((appointment) => {
    return (
      getDatePart(appointment.appointmentDate) === selectedDate &&
      [appointment.patientName, appointment.appointmentDate, appointment.status]
        .some((value) => String(value || '').toLowerCase().includes(search))
    );
  });

  const morning = filtered.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour < 12;
  });

  const afternoon = filtered.filter((appointment) => {
    const hour = getHour(appointment.appointmentDate);
    return hour !== null && hour >= 12;
  });

  renderSlot('adminMorningAppointmentList', morning);
  renderSlot('adminAfternoonAppointmentList', afternoon);

  const table = el('appointmentTable');
  if (!table) return;

  table.innerHTML = filtered.map((appointment) => `
    <tr>
      <td>${appointment.patientName}</td>
      <td>${getDatePart(appointment.appointmentDate)}</td>
      <td>${getTimePart(appointment.appointmentDate)}</td>
      <td>${appointment.status}</td>
    </tr>
  `).join('');
}

function goToTodayAdminSchedule() {
  const today = new Date().toISOString().split('T')[0];
  if (el('adminSelectedDate')) {
    el('adminSelectedDate').value = today;
  }
  renderAdminAppointmentsPage();
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
          <button class="btn btn-secondary small-btn" onclick="selectPatient(${patient.id})">Edit</button>
          <button class="btn btn-danger small-btn" onclick="deletePatient(${patient.id})">Delete</button>
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
  const box = el('recordDetails');
  if (!box) return;

  const patient = patients.find((item) => Number(item.id) === Number(selectedPatientId)) || patients[0];
  if (!patient) {
    box.innerHTML = 'Click a patient to view record details.';
    return;
  }

  box.innerHTML = `
    <strong>${patient.name}</strong><br>
    <span class="sub-text">ID: ${patient.id}</span><br>
    <span class="sub-text">Email: ${patient.email || 'No email'}</span><br>
    <span class="sub-text">Phone: ${patient.phone || 'N/A'}</span><br>
    <span class="sub-text">Condition: ${patient.condition || 'General'}</span><br>
    <span class="sub-text">Diagnosis: ${patient.diagnosis || 'Pending assessment'}</span>
  `;

  if (el('editPatientName')) el('editPatientName').value = patient.name || '';
  if (el('editPatientEmail')) el('editPatientEmail').value = patient.email || '';
  if (el('editPatientPhone')) el('editPatientPhone').value = patient.phone || '';
  if (el('editPatientCondition')) el('editPatientCondition').value = patient.condition || '';
  if (el('editPatientDiagnosis')) el('editPatientDiagnosis').value = patient.diagnosis || '';
}

function savePatientRecord() {
  const patient = patients.find((item) => Number(item.id) === Number(selectedPatientId));
  if (!patient) return;

  patient.name = el('editPatientName')?.value.trim() || patient.name;
  patient.email = el('editPatientEmail')?.value.trim() || '';
  patient.phone = el('editPatientPhone')?.value.trim() || '';
  patient.condition = el('editPatientCondition')?.value.trim() || '';
  patient.diagnosis = el('editPatientDiagnosis')?.value.trim() || '';

  saveAll();
  renderPatients();
  renderRecordDetails();
}

function submitNewPatient() {
  const patient = {
    id: Date.now(),
    name: el('addName')?.value.trim(),
    email: el('addEmail')?.value.trim(),
    phone: el('addPhone')?.value.trim(),
    condition: el('addCondition')?.value.trim() || 'General',
    diagnosis: el('addDiagnosis')?.value.trim() || 'Pending assessment'
  };

  if (!patient.name) return;

  patients.push(patient);
  saveAll();
  renderAll();
  showSection('patients');
}

function deletePatient(id) {
  if (!confirm('Delete this patient?')) return;

  patients = patients.filter((patient) => Number(patient.id) !== Number(id));
  appointments = appointments.filter((appointment) => Number(appointment.patientId) !== Number(id));
  bills = bills.filter((bill) => Number(bill.patient_id) !== Number(id));

  saveAll();
  renderAll();
  refreshCalendar();
}

function renderBilling() {
  if (el('billingPatient')) {
    el('billingPatient').innerHTML = patients.map((patient) => `
      <option value="${patient.id}">${patient.id} - ${patient.name}</option>
    `).join('');
  }

  if (el('billingTable')) {
    el('billingTable').innerHTML = bills.map((bill) => `
      <tr>
        <td>${bill.invoice}</td>
        <td>${bill.amount}</td>
      </tr>
    `).join('');
  }
}

function addBill() {
  const patientId = el('billingPatient')?.value;
  const patient = patients.find((item) => Number(item.id) === Number(patientId));

  const bill = {
    id: Date.now(),
    patient_id: patientId,
    patient_name: patient ? patient.name : '',
    invoice: el('billingInvoice')?.value.trim(),
    amount: el('billingAmount')?.value
  };

  if (!bill.invoice) return;

  bills.push(bill);
  saveAll();
  renderBilling();

  if (el('billingInvoice')) el('billingInvoice').value = '';
  if (el('billingAmount')) el('billingAmount').value = '';
}

function renderNotifications() {
  if (el('notificationPatient')) {
    el('notificationPatient').innerHTML = patients.map((patient) => `
      <option value="${patient.id}">${patient.id} - ${patient.name}</option>
    `).join('');
  }

  if (el('notificationTable')) {
    el('notificationTable').innerHTML = notifications.map((notification) => `
      <tr>
        <td>${notification.patient_name}</td>
        <td>${notification.type}</td>
        <td>${notification.message}</td>
        <td>${notification.status}</td>
      </tr>
    `).join('');
  }
}

function sendNotification() {
  const patientId = el('notificationPatient')?.value;
  const patient = patients.find((item) => Number(item.id) === Number(patientId));

  const notification = {
    id: Date.now(),
    patient_name: patient ? patient.name : '',
    type: 'Email',
    message: el('notificationMessage')?.value.trim(),
    status: 'Sent'
  };

  if (!notification.message) return;

  notifications.push(notification);
  saveAll();
  renderNotifications();

  if (el('notificationMessage')) el('notificationMessage').value = '';
}

function addAppointment() {
  const patientName = el('appointmentPatient')?.value.trim();
  const matchedPatient = patients.find(
    (patient) => String(patient.name).toLowerCase() === patientName.toLowerCase()
  );

  const appointment = {
    id: Date.now(),
    patientId: matchedPatient ? matchedPatient.id : null,
    patientName,
    appointmentDate: el('appointmentDate')?.value,
    status: 'Scheduled'
  };

  if (!appointment.patientName || !appointment.appointmentDate) return;

  appointments.push(appointment);
  saveAll();
  renderAdminAppointmentsPage();
  refreshCalendar();

  if (el('appointmentPatient')) el('appointmentPatient').value = '';
  if (el('appointmentDate')) el('appointmentDate').value = '';
}

function renderAll() {
  if (el('welcomeText')) {
    el('welcomeText').innerText = `Welcome, ${currentUser.email}`;
  }

  if (el('patientCount')) {
    el('patientCount').innerText = patients.length;
  }

  if (el('appointmentCount')) {
    el('appointmentCount').innerText = appointments.length;
  }

  if (el('billCount')) {
    el('billCount').innerText = bills.length;
  }

  if (el('notificationCount')) {
    el('notificationCount').innerText = notifications.length;
  }

  if (el('adminSelectedDate') && !el('adminSelectedDate').value) {
    el('adminSelectedDate').value = new Date().toISOString().split('T')[0];
  }

  renderAdminAppointmentsPage();
  renderPatients();
  renderRecordDetails();
  renderBilling();
  renderNotifications();
  initAdminCalendar();
}

renderAll();
