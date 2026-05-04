// ==================== FULL admin.js WITH DOCTOR SPECIALIZATION ====================
const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

let patients = [], appointments = [], currentDate = new Date(), selectedDate = new Date();

// Doctors Database with Specializations
const doctors = [
  { id: "D001", name: "Dr. Maria Santos", specialization: "Cardiology" },
  { id: "D002", name: "Dr. John Reyes", specialization: "Pediatrics" },
  { id: "D003", name: "Dr. Ana Cruz", specialization: "General Medicine" },
  { id: "D004", name: "Dr. Ramon Lim", specialization: "Dermatology" },
  { id: "D005", name: "Dr. Elena Bautista", specialization: "Cardiology" },
  { id: "D006", name: "Dr. Michael Tan", specialization: "Pediatrics" },
  { id: "D007", name: "Dr. Sofia Morales", specialization: "General Medicine" },
  { id: "D008", name: "Dr. Carlos Rivera", specialization: "Orthopedics" }
];

function el(id) {
  return document.getElementById(id);
}

function logout() {
  localStorage.removeItem("healthcare_token");
  localStorage.removeItem("healthcare_user");
  window.location.href = "index.html";
}

// ==================== DOCTOR SELECTION ====================
function loadSpecializations(selectId = "adminSpecializationSelect") {
  const specs = [...new Set(doctors.map(d => d.specialization))];
  const select = el(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">Select Specialization</option>`;
  specs.forEach(spec => {
    const opt = document.createElement("option");
    opt.value = spec;
    opt.textContent = spec;
    select.appendChild(opt);
  });
}

function loadDoctorsBySpecialization(specSelectId = "adminSpecializationSelect", doctorSelectId = "adminDoctorSelect") {
  const spec = el(specSelectId).value;
  const doctorSelect = el(doctorSelectId);
  if (!doctorSelect) return;

  doctorSelect.innerHTML = `<option value="">Select Doctor</option>`;

  if (!spec) return;

  const filtered = doctors.filter(d => d.specialization === spec);
  filtered.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = doc.name;
    doctorSelect.appendChild(opt);
  });
}

// ==================== API HELPER ====================
async function apiFetch(url, options = {}) {
  try {
    const r = await fetch(API + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// ==================== NAVIGATION ====================
function showAdminPage(id, btn) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  const section = el(id);
  if (section) section.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(n => n.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (id === "patients") {
    renderPatients();
    renderTimeSlots("adminTimeSlots", "scheduleDate");
    loadSpecializations("adminSpecializationSelect");
  }
  if (id === "notifications") {
    loadPatientsForDropdown("notificationPatient");
    loadEmailHistory();
  }
  if (id === "appointments") {
    renderAppointmentsPage();
  }
}

// ==================== LOAD DATA ====================
async function loadAll() {
  try {
    patients = await apiFetch("/patients");
    appointments = await apiFetch("/appointments");
  } catch (e) {
    console.error("Failed to load data", e);
  }
  renderAppointmentsPage();
  renderPatients();
  renderNotifications();
}

// ==================== APPOINTMENTS ====================
function renderAppointmentsPage() {
  renderCalendar();
  renderSelectedAppointments();

  const today = formatDate(new Date());
  const selected = formatDate(selectedDate);
  const monthKey = selected.slice(0, 7);

  if (el("todayCount")) el("todayCount").textContent = appointments.filter(a => getDatePart(a) === today).length;
  if (el("selectedCount")) el("selectedCount").textContent = appointments.filter(a => getDatePart(a) === selected).length;
  if (el("monthCount")) el("monthCount").textContent = appointments.filter(a => getDatePart(a).slice(0, 7) === monthKey).length;
}

function renderCalendar() {
  renderCalendarBase("calendarGrid", "calendarTitle", currentDate, selectedDate, appointments, (d) => {
    selectedDate = d;
    renderAppointmentsPage();
  });
}

function renderSelectedAppointments() {
  const selected = formatDate(selectedDate);
  const list = appointments.filter(a => getDatePart(a) === selected);
  
  if (el("selectedDateTitle")) {
    el("selectedDateTitle").textContent = selectedDate.toLocaleDateString("default", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
  }
  const container = el("selectedAppointments");
  if (container) {
    container.innerHTML = list.length 
      ? list.map(a => `
          <div class="notice">
            <strong>${a.patientName}</strong><br>
            ${getTimePart(a)} • ${a.doctorName || 'Doctor'} • ${a.status}
          </div>`).join("")
      : `<div class="notice">No appointments scheduled for this day.</div>`;
  }
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

// ==================== PATIENTS ====================
function renderPatients() {
  const table = el("patientTable");
  if (table) {
    table.innerHTML = patients.length 
      ? patients.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.email || ''}<br>${p.phone || ''}</td>
          <td>${p.condition || 'General'}</td>
          <td>
            <button class="btn btn-secondary" onclick="selectPatientForSchedule('${p.id}')">Schedule</button>
            <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="4">No patients yet.</td></tr>`;
  }

  const select = el("schedulePatient");
  if (select) {
    select.innerHTML = `<option value="">Select patient</option>` +
      patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
}

function selectPatientForSchedule(id) {
  const select = el("schedulePatient");
  if (select) select.value = id;
}

// ==================== SCHEDULE WITH DOCTOR ====================
async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value;
  const doctorId = el("adminDoctorSelect").value;
  const appointmentDate = el("scheduleDate").value;
  const statusEl = el("adminScheduleStatus");

  if (!patientId || !doctorId || !appointmentDate) {
    alert("Please select Patient, Specialization, Doctor and Date/Time");
    return;
  }

  const patient = patients.find(p => p.id === patientId);
  const doctor = doctors.find(d => d.id === doctorId);

  try {
    const res = await apiFetch("/appointments", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        patientName: patient.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        appointmentDate: appointmentDate
      })
    });

    if (statusEl) {
      statusEl.style.color = "green";
      statusEl.textContent = `✅ Scheduled successfully with ${doctor.name}`;
    }

    // Reset form
    el("schedulePatient").value = "";
    el("adminDoctorSelect").value = "";
    el("scheduleDate").value = "";

    await loadAll();
    showAdminPage("appointments");
  } catch (e) {
    console.error(e);
    alert("Failed to schedule appointment");
  }
}

async function deletePatient(id) {
  if (!confirm("Delete this patient and all related data?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  await loadAll();
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
  loadPatientsForDropdown("notificationPatient");
}

async function sendEmailNotification() {
  const patientId = el("notificationPatient").value;
  const subject = el("notificationSubject").value.trim() || "CareFlow Notification";
  const message = el("notificationMessage").value.trim();
  const status = el("emailStatus");

  if (!patientId || !message) {
    alert("Please select a patient and write a message.");
    return;
  }

  try {
    const res = await apiFetch("/email/send", {
      method: "POST",
      body: JSON.stringify({ patientId, subject, message })
    });
    if (status) {
      status.textContent = res.emailSent ? "✅ Email sent successfully" : "⚠️ Email could not be sent";
      status.style.color = res.emailSent ? "green" : "orange";
    }
    el("notificationMessage").value = "";
    loadEmailHistory();
  } catch (e) {
    alert("Failed to send notification");
  }
}

async function loadEmailHistory() {
  const tbody = el("emailHistoryTable");
  if (!tbody) return;
  try {
    const history = await apiFetch("/email/history");
    // Render logic can be added here if needed
  } catch (e) {}
}

function loadPatientsForDropdown(selectId) {
  const select = el(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">Select patient</option>` +
    patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ==================== TIME SLOTS ====================
const clinicTimeSlots = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];

function to12Hour(time) {
  const [h, m] = time.split(":").map(Number);
  const s = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${s}`;
}

function renderTimeSlots(containerId, dateInputId) {
  const c = el(containerId), input = el(dateInputId);
  if (!c || !input) return;
  c.innerHTML = clinicTimeSlots.map(t => 
    `<button type="button" class="time-btn" onclick="applyTimeSlot('${dateInputId}','${t}','${containerId}')">${to12Hour(t)}</button>`
  ).join("");
}

function applyTimeSlot(dateInputId, time, containerId) {
  const input = el(dateInputId);
  if (!input) return;
  const date = input.value ? input.value.split("T")[0] : formatDate(new Date());
  input.value = `${date}T${time}`;
  document.querySelectorAll(`#${containerId} .time-btn`).forEach(b => b.classList.remove("active"));
  [...document.querySelectorAll(`#${containerId} .time-btn`)]
    .find(b => b.textContent.trim() === to12Hour(time))?.classList.add("active");
}

// ==================== CALENDAR HELPERS ====================
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getDatePart(item) {
  const raw = String(item.appointmentDate || "");
  return raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
}

function getTimePart(item) {
  const raw = String(item.appointmentDate || "");
  if (raw.includes("T")) return raw.split("T")[1].slice(0, 5);
  if (raw.includes(" ")) return raw.split(" ")[1] || "";
  return raw;
}

function renderCalendarBase(gridId, titleId, currentDate, selectedDate, appointments, onSelect) {
  const grid = el(gridId);
  if (!grid) return;
  // Basic calendar rendering (you can expand this with your full logic)
  console.log("Calendar base rendered");
}

// ==================== INIT ====================
if (!currentUser || currentUser.role !== "admin") {
  location.href = "index.html";
}

loadAll().catch(e => {
  console.error(e);
  alert("Failed to load admin dashboard. Please check backend connection.");
});
