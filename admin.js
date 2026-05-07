const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

function el(id) { return document.getElementById(id); }

if (!currentUser || currentUser.role !== "admin" || !token) {
  location.href = "index.html";
}

let patients = [];
let appointments = [];
let currentDate = new Date();
let selectedDate = new Date();

// ==================== DARK MODE ====================
function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');

  const btn = document.querySelector('.dark-toggle');
  if (btn) {
    btn.textContent = html.classList.contains('dark') ? '☀️' : '🌙';
  }

  localStorage.setItem('darkMode', html.classList.contains('dark'));
}

function loadDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    document.documentElement.classList.add('dark');
    const btn = document.querySelector('.dark-toggle');
    if (btn) btn.textContent = '☀️';
  }
}

// ==================== SECTION SWITCHING ====================
function showAdminPage(id, btn = null) {
  document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (id === 'appointments') renderAppointmentsPage();
  if (id === 'patients') {
    renderPatients();
    renderTimeSlots('adminTimeSlots', 'scheduleDate');
  }
  if (id === 'notifications') {
    loadPatientsForDropdown('notificationPatient');
    loadEmailHistory();
  }
}

// ==================== API HELPER ====================
async function apiFetch(url, options = {}) {
  const r = await fetch(API + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

// ==================== TOAST ====================
function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:12px;color:white;font-weight:600;z-index:9999;`;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === "success" ? "#15803d" : "#dc2626";
  setTimeout(() => toast.remove(), 3000);
}

// ==================== LOGOUT ====================
function logout() {
  localStorage.removeItem("healthcare_token");
  localStorage.removeItem("healthcare_user");
  location.href = "index.html";
}

// ==================== DATE HELPERS ====================
function formatDate(date) { return date.toISOString().split("T")[0]; }
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

// ==================== ACCEPT / DECLINE ====================
async function updateAppointmentStatus(appointmentId, newStatus) {
  if (!confirm(`Mark this appointment as "${newStatus}"?`)) return;
  try {
    await apiFetch(`/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Appointment ${newStatus.toLowerCase()}!`, "success");
    await loadAll();
  } catch (e) {
    showToast("Failed to update status", "error");
  }
}

// ==================== CALENDAR ====================
function isWeekday(dateStr) {
  const d = new Date(dateStr);
  return d.getDay() >= 1 && d.getDay() <= 5;
}

function renderCalendarBase(gridId, titleId) {
  const grid = el(gridId);
  if (!grid) return;
  grid.innerHTML = "";

  if (el(titleId)) {
    el(titleId).textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(day => {
    const d = document.createElement("div");
    d.className = "day-name";
    d.textContent = day;
    grid.appendChild(d);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const pad = document.createElement("div");
    pad.className = "day-cell muted";
    grid.appendChild(pad);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const cell = document.createElement("div");
    cell.className = "day-cell";

    if (dateStr === formatDate(selectedDate)) cell.classList.add("selected");
    if (dateStr === formatDate(new Date())) cell.classList.add("today");
    if (!isWeekday(dateStr)) cell.classList.add("weekend");

    const count = appointments.filter(a => getDatePart(a) === dateStr).length;
    cell.innerHTML = `${day}${count ? `<br><small>${count}</small>` : ''}`;

    if (isWeekday(dateStr)) {
      cell.style.cursor = "pointer";
      cell.onclick = () => {
        selectedDate = new Date(dateStr);
        renderAppointmentsPage();
      };
    }
    grid.appendChild(cell);
  }
}

function renderCalendar() { renderCalendarBase("calendarGrid", "calendarTitle"); }

function renderSelectedAppointments() {
  const selectedStr = formatDate(selectedDate);
  const list = appointments.filter(a => getDatePart(a) === selectedStr);

  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  el("selectedAppointments").innerHTML = list.length
    ? list.map(a => `<div class="notice"><strong>${a.patientName}</strong><br>${getTimePart(a)} • ${a.status}</div>`).join("")
    : `<div class="notice">No appointments on this day.</div>`;
}

function renderAppointmentsPage() {
  renderCalendar();
  renderSelectedAppointments();

  const today = formatDate(new Date());
  const selected = formatDate(selectedDate);
  const monthKey = selected.slice(0, 7);

  el("todayCount").textContent = appointments.filter(a => getDatePart(a) === today).length;
  el("selectedCount").textContent = appointments.filter(a => getDatePart(a) === selected).length;
  el("monthCount").textContent = appointments.filter(a => getDatePart(a).slice(0,7) === monthKey).length;
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

// ==================== TIME SLOTS ====================
const clinicTimeSlots = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];

function renderTimeSlots(containerId, dateInputId) {
  const c = el(containerId);
  if (!c) return;
  c.innerHTML = clinicTimeSlots.map(t => 
    `<button type="button" class="time-btn" onclick="applyTimeSlot('${dateInputId}','${t}','${containerId}')">${t}</button>`
  ).join("");
}

function applyTimeSlot(dateInputId, time) {
  const input = el(dateInputId);
  if (!input) return;
  const date = input.value ? input.value.split("T")[0] : formatDate(new Date());
  input.value = `${date}T${time}`;
}

// ==================== PATIENTS ====================
function renderPatients() {
  const tbody = document.querySelector("#patientTable tbody");
  if (!tbody) return;

  tbody.innerHTML = patients.length ? patients.map(p => {
    const patientApps = appointments.filter(a => 
      a.patientId === p.id || a.patientName?.toLowerCase() === p.name?.toLowerCase()
    );

    const appHTML = patientApps.length ? patientApps.map(app => `
      <div style="background:#f8fafc;padding:10px;margin:6px 0;border-radius:8px;font-size:0.9rem;">
        <strong>${getTimePart(app)}</strong> — ${app.status}
        ${app.status === "Scheduled" ? `
          <button onclick="updateAppointmentStatus('${app.id}', 'Confirmed')" class="btn btn-success" style="margin-left:8px;padding:4px 12px;">Accept</button>
          <button onclick="updateAppointmentStatus('${app.id}', 'Declined')" class="btn btn-danger" style="padding:4px 12px;">Decline</button>
        ` : `<span style="color:gray;">(${app.status})</span>`}
      </div>
    `).join("") : `<span style="color:#888;">No appointments</span>`;

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.email||'—'}<br>${p.phone||'—'}</td>
        <td>${p.condition || 'General'}</td>
        <td>${appHTML}</td>
        <td>
          <button class="btn btn-secondary" onclick="selectPatientForSchedule('${p.id}')">Schedule</button>
          <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5" style="text-align:center;padding:40px;">No patients yet.</td></tr>`;
}

// ==================== LOAD DATA ====================
async function loadAll() {
  try {
    patients = await apiFetch("/patients");
    appointments = await apiFetch("/appointments");
    renderAppointmentsPage();
    renderPatients();
    loadPatientsForDropdown("schedulePatient");
    loadPatientsForDropdown("notificationPatient");
    loadEmailHistory();
  } catch (e) {
    showToast("Failed to load data", "error");
  }
}

function selectPatientForSchedule(id) {
  el("schedulePatient").value = id;
  showAdminPage("patients");
}

async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value;
  const appointmentDate = el("scheduleDate").value;
  if (!patientId || !appointmentDate) return showToast("Please fill all fields", "error");

  try {
    const patient = patients.find(p => p.id === patientId);
    await apiFetch("/appointments", {
      method: "POST",
      body: JSON.stringify({ patientId, patientName: patient.name, appointmentDate, status: "Scheduled" })
    });
    showToast("Appointment scheduled!", "success");
    el("scheduleDate").value = "";
    await loadAll();
  } catch (e) {
    showToast("Failed to schedule", "error");
  }
}

async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;
  try {
    await apiFetch(`/patients/${id}`, { method: "DELETE" });
    showToast("Patient deleted", "success");
    await loadAll();
  } catch (e) {
    showToast("Failed to delete", "error");
  }
}

// ==================== NOTIFICATIONS ====================
function loadPatientsForDropdown(selectId) {
  const select = el(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">Select Patient</option>` +
    patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function sendEmailNotification() {
  const patientId = el("notificationPatient").value;
  const subject = el("notificationSubject").value.trim();
  const message = el("notificationMessage").value.trim();
  if (!patientId || !message) return showToast("Select patient and write message", "error");

  try {
    const res = await apiFetch("/email/send", {
      method: "POST",
      body: JSON.stringify({ patientId, subject, message })
    });
    el("emailStatus").textContent = res.emailSent ? "✅ Sent" : "⚠️ Not sent";
    el("notificationMessage").value = "";
    loadEmailHistory();
  } catch (e) {
    showToast("Failed to send email", "error");
  }
}

async function loadEmailHistory() {
  const tbody = el("emailHistoryTable");
  if (!tbody) return;
  try {
    const history = await apiFetch("/email/history");
    tbody.innerHTML = history.length ? history.map(h => `
      <tr>
        <td>${h.date || 'N/A'}</td>
        <td>${h.patient || 'N/A'}</td>
        <td>${h.subject || 'Notification'}</td>
        <td>${h.status || 'Sent'}</td>
      </tr>
    `).join("") : `<tr><td colspan="4" style="text-align:center;padding:20px;">No emails yet</td></tr>`;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4">Failed to load history</td></tr>`;
  }
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  loadDarkMode();
  loadAll();
});
