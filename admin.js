const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

function el(id) {
  return document.getElementById(id);
}

if (!currentUser || currentUser.role !== "admin" || !token) {
  location.href = "index.html";
}

let patients = [];
let appointments = [];
let currentDate = new Date();
let selectedDate = new Date();

// ==================== API HELPER ====================
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

// ==================== DARK MODE ====================
function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  const btn = document.querySelector('.dark-toggle');
  if (btn) btn.textContent = html.classList.contains('dark') ? '☀️' : '🌙';
  localStorage.setItem('darkMode', html.classList.contains('dark'));
}

function loadDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
    const btn = document.querySelector('.dark-toggle');
    if (btn) btn.textContent = '☀️';
  }
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:12px;color:white;font-weight:600;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.2);`;
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
  window.location.href = "index.html";
}

// ==================== DATE HELPERS ====================
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

// ==================== TIME SLOTS ====================
const clinicTimeSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

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
  [...document.querySelectorAll(`#${containerId} .time-btn`)].find(b => b.textContent.trim() === to12Hour(time))?.classList.add("active");
}

// ==================== CALENDAR ====================
function renderCalendarBase(gridId, titleId, currentDate, selectedDate, appointments, onSelect) {
  const grid = el(gridId);
  if (!grid) return;
  grid.innerHTML = "";

  if (el(titleId)) {
    el(titleId).textContent = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  }

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach(day => {
    const d = document.createElement("div");
    d.className = "day-name";
    d.textContent = day;
    grid.appendChild(d);
  });

  const y = currentDate.getFullYear(), m = currentDate.getMonth();
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

function renderCalendar() {
  renderCalendarBase("calendarGrid", "calendarTitle", currentDate, selectedDate, appointments, (d) => {
    selectedDate = d;
    renderAppointmentsPage();
  });
}

function renderSelectedAppointments() {
  const selected = formatDate(selectedDate);
  const list = appointments.filter(a => getDatePart(a) === selected);

  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString("default", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

  el("selectedAppointments").innerHTML = list.length
    ? list.map(a => `<div class="notice"><strong>${a.patientName}</strong><br>${getTimePart(a)} · ${a.status}</div>`).join("")
    : `<div class="notice">No appointments scheduled for this day.</div>`;
}

function renderAppointmentsPage() {
  renderCalendar();
  renderSelectedAppointments();

  const today = formatDate(new Date());
  const selected = formatDate(selectedDate);
  const monthKey = selected.slice(0, 7);

  el("todayCount").textContent = appointments.filter(a => getDatePart(a) === today).length;
  el("selectedCount").textContent = appointments.filter(a => getDatePart(a) === selected).length;
  el("monthCount").textContent = appointments.filter(a => getDatePart(a).slice(0, 7) === monthKey).length;
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

// ==================== ACCEPT / DECLINE APPOINTMENT ====================
async function updateAppointmentStatus(appointmentId, newStatus) {
  if (!confirm(`Mark this appointment as "${newStatus}"?`)) return;
  try {
    await apiFetch(`/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Appointment ${newStatus.toLowerCase()} successfully!`, "success");
    await loadAll();
  } catch (e) {
    showToast("Failed to update status", "error");
  }
}

// ==================== RENDER PATIENTS WITH ACCEPT/DECLINE ====================
function renderPatients() {
  const table = el("patientTable");
  if (!table) return;

  table.innerHTML = patients.length ? patients.map(p => {
    const patientApps = appointments.filter(a => 
      a.patientId === p.id || a.patientName?.toLowerCase() === p.name?.toLowerCase()
    );

    const appHTML = patientApps.length ? patientApps.map(app => `
      <div style="background:#f8fafc; padding:8px; margin:4px 0; border-radius:6px; font-size:0.85rem;">
        <strong>${getTimePart(app)}</strong> — ${app.status}
        ${app.status === "Scheduled" ? `
          <button onclick="updateAppointmentStatus('${app.id}', 'Confirmed')" class="btn btn-success" style="padding:2px 8px; margin-left:6px; font-size:0.75rem;">Accept</button>
          <button onclick="updateAppointmentStatus('${app.id}', 'Declined')" class="btn btn-danger" style="padding:2px 8px; font-size:0.75rem;">Decline</button>
        ` : `<span style="color:gray;">(${app.status})</span>`}
      </div>
    `).join("") : `<span style="color:#888; font-size:0.85rem;">No upcoming appointments</span>`;

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.email || "—"}<br>${p.phone || "—"}</td>
        <td>${p.condition || "General"}</td>
        <td>${appHTML}</td>
        <td>
          <button class="btn btn-secondary" onclick="selectPatientForSchedule('${p.id}')">Schedule</button>
          <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5" style="text-align:center; padding:30px;">No patients yet.</td></tr>`;

  const s = el("schedulePatient");
  if (s) {
    s.innerHTML = `<option value="">Select patient</option>` + 
      patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
  }
}

function selectPatientForSchedule(id) {
  const s = el("schedulePatient");
  if (s) s.value = id;
  el("scheduleDate")?.focus();
}

// ==================== SUBMIT NEW PATIENT ====================
async function submitNewPatient() {
  const body = {
    name: el("addName").value.trim(),
    email: el("addEmail").value.trim(),
    phone: el("addPhone").value.trim(),
    condition: el("addCondition").value.trim() || "General",
    diagnosis: el("addDiagnosis").value.trim() || "Pending assessment",
  };
  if (!body.name) return alert("Patient name is required.");

  await apiFetch("/patients", { method: "POST", body: JSON.stringify(body) });
  ["addName", "addEmail", "addPhone", "addCondition", "addDiagnosis"].forEach(id => (el(id).value = ""));
  await loadAll();
}

// ==================== SCHEDULE WITH DOCTOR SPECIALIZATION ====================
async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value;
  const specialization = el("doctorSpecialization")?.value;
  const appointmentDate = el("scheduleDate").value;
  const statusEl = el("adminScheduleStatus");

  if (statusEl) statusEl.textContent = "";

  if (!patientId || !specialization || !appointmentDate) {
    return alert("Please select patient, doctor specialization, and date/time.");
  }

  const err = validateScheduleDate(appointmentDate);
  if (err) return alert(err);

  const patient = patients.find(p => p.id === patientId);
  if (!patient) return alert("Patient not found.");

  try {
    const res = await apiFetch("/appointments", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        patientName: patient.name,
        appointmentDate,
        status: "Scheduled",
        doctorSpecialization: specialization
      })
    });

    el("schedulePatient").value = "";
    el("scheduleDate").value = "";
    if (el("doctorSpecialization")) el("doctorSpecialization").value = "";

    if (statusEl) {
      statusEl.textContent = res.emailSent 
        ? "Patient scheduled and email confirmation sent." 
        : "Patient scheduled. Email was not sent.";
    }

    await loadAll();
    showAdminPage("appointments", document.querySelector(".nav-btn"));
  } catch (e) {
    alert("Failed to schedule appointment.");
  }
}

// ==================== DELETE PATIENT ====================
async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  await loadAll();
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
  const s = el("notificationPatient");
  if (!s) return;
  s.innerHTML = `<option value="">Select patient</option>` + 
    patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
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
        <td style="text-align:center;">
          <button onclick="deleteEmailLog(this)" style="background:none;border:none;color:red;cursor:pointer;">Delete</button>
        </td>
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

// ==================== FIXED SECTION SWITCHING ====================
function showAdminPage(id, btn = null) {
  document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
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

// ==================== LOAD ALL DATA ====================
async function loadAll() {
  try {
    patients = await apiFetch("/patients");
    appointments = await apiFetch("/appointments");
    renderAppointmentsPage();
    renderPatients();
    renderNotifications();
    renderTimeSlots("adminTimeSlots", "scheduleDate");
  } catch (e) {
    console.error(e);
    alert("Failed to load admin data. Check backend connection.");
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadDarkMode();
  loadAll();
});
