// ==================== admin.js - Full Updated Version with Doctor Selection ====================
const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(
  localStorage.getItem("healthcare_user") || "null"
);

function el(id) {
  return document.getElementById(id);
}

function logout() {
  localStorage.removeItem("healthcare_token");
  localStorage.removeItem("healthcare_user");
  window.location.href = "index.html";
}

async function apiFetch(url, options = {}) {
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
}

// ==================== DOCTORS DATABASE ====================
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

function loadSpecializations() {
  const specs = [...new Set(doctors.map(d => d.specialization))];
  const select = el("scheduleSpecialization");
  if (!select) return;
  select.innerHTML = `<option value="">Select Specialization</option>`;
  specs.forEach(spec => {
    const opt = document.createElement("option");
    opt.value = spec;
    opt.textContent = spec;
    select.appendChild(opt);
  });
}

function loadDoctorsBySpecialization() {
  const spec = el("scheduleSpecialization").value;
  const doctorSelect = el("scheduleDoctor");
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

// ==================== HELPER FUNCTIONS ====================
function showSection(id, btn = null) {
  document.querySelectorAll("main section").forEach((s) => s.classList.add("hidden"));
  const t = el(id);
  if (t) t.classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((n) => n.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

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

function isWeekday(dateString) {
  const d = new Date(dateString).getDay();
  return d >= 1 && d <= 5;
}

function isBusinessHour(dateString) {
  const d = new Date(dateString);
  const h = d.getHours();
  const m = d.getMinutes();
  return h >= 8 && (h < 18 || (h === 18 && m === 0));
}

function validateScheduleDate(dateString) {
  if (!dateString) return "Select appointment date and time.";
  if (!isWeekday(dateString)) return "Appointments are only allowed Monday to Friday.";
  if (!isBusinessHour(dateString)) return "Appointments are only allowed from 8:00 AM to 6:00 PM.";
  return "";
}

const clinicTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

function to12Hour(time) {
  const [h, m] = time.split(":").map(Number);
  const s = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${s}`;
}

function renderTimeSlots(containerId, dateInputId) {
  const c = el(containerId), input = el(dateInputId);
  if (!c || !input) return;
  c.innerHTML = clinicTimeSlots
    .map(t => `<button type="button" class="time-btn" onclick="applyTimeSlot('${dateInputId}','${t}','${containerId}')">${to12Hour(t)}</button>`)
    .join("");
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

function renderCalendarBase(gridId, titleId, currentDate, selectedDate, appointments, onSelect) {
  const grid = el(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  if (el(titleId)) el(titleId).textContent = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach(day => {
    const d = document.createElement("div");
    d.className = "day-name";
    d.textContent = day;
    grid.appendChild(d);
  });

  const first = new Date(y, m, 1), start = new Date(first);
  start.setDate(start.getDate() - first.getDay());

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = formatDate(d);
    const cell = document.createElement("button");
    cell.className = "day-cell";
    if (d.getMonth() !== m) cell.classList.add("muted");
    if (formatDate(d) === formatDate(selectedDate)) cell.classList.add("selected");
    if (formatDate(d) === formatDate(new Date())) cell.classList.add("today");
    if (!isWeekday(key)) cell.classList.add("weekend");

    const count = appointments.filter(a => getDatePart(a) === key).length;
    cell.innerHTML = count ? `${d.getDate()}<br><small>${count} patient${count > 1 ? "s" : ""}</small>` : d.getDate();
    if (isWeekday(key)) cell.onclick = () => onSelect(d);
    grid.appendChild(cell);
  }
}

// ==================== MAIN VARIABLES ====================
if (!currentUser || currentUser.role !== "admin" || !token)
  location.href = "index.html";

let patients = [], appointments = [], currentDate = new Date(), selectedDate = new Date();

// ==================== PAGE RENDERING ====================
function showAdminPage(id, btn) {
  showSection(id, btn);
  if (id === "appointments") renderAppointmentsPage();
  if (id === "patients") {
    renderPatients();
    renderTimeSlots("adminTimeSlots", "scheduleDate");
    loadSpecializations();        // Load doctors when patients tab opens
  }
  if (id === "notifications") {
    loadPatientsForDropdown("notificationPatient");
    loadEmailHistory();
  }
}

async function loadAll() {
  try {
    patients = await apiFetch("/patients");
    appointments = await apiFetch("/appointments");
  } catch (e) {
    console.error(e);
  }
  renderAppointmentsPage();
  renderPatients();
  renderNotifications();
  renderTimeSlots("adminTimeSlots", "scheduleDate");
}

function renderAppointmentsPage() {
  renderCalendar();
  renderSelectedAppointments();
  const today = formatDate(new Date()),
        selected = formatDate(selectedDate),
        monthKey = selected.slice(0, 7);

  el("todayCount").textContent = appointments.filter(a => getDatePart(a) === today).length;
  el("selectedCount").textContent = appointments.filter(a => getDatePart(a) === selected).length;
  el("monthCount").textContent = appointments.filter(a => getDatePart(a).slice(0, 7) === monthKey).length;
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
  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  el("selectedAppointments").innerHTML = list.length
    ? list.map(a => `<div class="notice"><strong>${a.patientName}</strong><br/>${getTimePart(a)} · ${a.doctorName || 'Doctor'} · ${a.status}</div>`).join("")
    : `<div class="notice">No appointments scheduled for this day.</div>`;
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

function renderPatients() {
  const table = el("patientTable");
  table.innerHTML = patients.length
    ? patients.map(p => `
      <tr>
        <td>${p.name || ""}</td>
        <td>${p.email || ""}<br/>${p.phone || ""}</td>
        <td>${p.condition || "General"}</td>
        <td>
          <button class="btn btn-secondary" onclick="selectPatientForSchedule('${p.id}')">Schedule</button>
          <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="4">No patients yet.</td></tr>`;

  const s = el("schedulePatient");
  if (s) s.innerHTML = `<option value="">Select patient</option>` + patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

function selectPatientForSchedule(id) {
  el("schedulePatient").value = id;
  el("scheduleDate")?.focus();
}

// ==================== SCHEDULE APPOINTMENT WITH DOCTOR ====================
async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value;
  const appointmentDate = el("scheduleDate").value;
  const doctorId = el("scheduleDoctor").value;
  const statusEl = el("adminScheduleStatus");

  if (!patientId) return alert("Please select a patient.");
  if (!appointmentDate) return alert("Please select date and time.");
  if (!doctorId) return alert("Please select a doctor.");

  const patient = patients.find(p => p.id === patientId);
  const doctor = doctors.find(d => d.id === doctorId);

  const err = validateScheduleDate(appointmentDate);
  if (err) return alert(err);

  try {
    const res = await apiFetch("/appointments", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        patientName: patient.name,
        appointmentDate,
        doctorId: doctor.id,
        doctorName: doctor.name,
        status: "Scheduled"
      })
    });

    // Reset form
    el("schedulePatient").value = "";
    el("scheduleDate").value = "";
    el("scheduleDoctor").value = "";
    el("scheduleSpecialization").value = "";

    if (statusEl) {
      statusEl.textContent = res.emailSent 
        ? `✅ Appointment scheduled with ${doctor.name} (Email sent)`
        : `✅ Appointment scheduled with ${doctor.name}`;
      statusEl.style.color = "green";
    }

    await loadAll();
    showAdminPage("appointments", document.querySelector(".nav-btn"));
  } catch (e) {
    alert("Failed to schedule appointment.");
  }
}

async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  await loadAll();
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
  const s = el("notificationPatient");
  if (!s) return;
  s.innerHTML = `<option value="">Select patient</option>` + patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function sendEmailNotification() {
  const patientId = el("notificationPatient").value;
  const subject = el("notificationSubject").value.trim() || "CareFlow Notification";
  const message = el("notificationMessage").value.trim();
  const status = el("emailStatus");

  if (status) status.textContent = "";

  if (!patientId || !message) return alert("Select a patient and write a message.");

  const res = await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({ patientId, subject, message })
  });

  if (status) {
    status.textContent = res.emailSent ? "✅ Email sent successfully." : "⚠️ Email could not be sent.";
    status.style.color = res.emailSent ? "green" : "orange";
  }

  el("notificationSubject").value = "";
  el("notificationMessage").value = "";
  loadEmailHistory();
}

async function loadEmailHistory() {
  const tbody = document.getElementById("emailHistoryTable");
  if (!tbody) return;

  try {
    const history = await apiFetch("/email/history");
    tbody.innerHTML = "";
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No emails sent yet.</td></tr>`;
      return;
    }
    history.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date || 'N/A'}</td>
        <td>${item.patient || 'N/A'}</td>
        <td>${item.subject || 'Notification'}</td>
        <td style="color:${(item.status === "Sent" || item.status === "Scheduled") ? "green" : "red"}; text-align:center;">${item.status || 'Sent'}</td>
        <td style="text-align:center;"><button onclick="deleteEmailLog(this)" style="background:none;border:none;color:red;cursor:pointer;">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:orange;">Failed to load history.</td></tr>`;
  }
}

function deleteEmailLog(btn) {
  if (confirm("Delete this log?")) btn.closest("tr").remove();
}

function loadPatientsForDropdown(selectId) {
  const select = el(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Select patient</option>';
  patients.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

// ==================== INIT ====================
loadAll().catch((e) => {
  console.error(e);
  alert("Failed to load admin data. Check backend connection.");
});
