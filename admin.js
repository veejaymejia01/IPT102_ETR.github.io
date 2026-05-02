const API = "https://etr-backend.onrender.com/api";

const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(
  localStorage.getItem("healthcare_user") || "null",
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
function showSection(id, btn = null) {
  document
    .querySelectorAll("main section")
    .forEach((s) => s.classList.add("hidden"));
  const t = el(id);
  if (t) t.classList.remove("hidden");
  document
    .querySelectorAll(".nav-btn")
    .forEach((n) => n.classList.remove("active"));
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
  if (!isWeekday(dateString))
    return "Appointments are only allowed Monday to Friday.";
  if (!isBusinessHour(dateString))
    return "Appointments are only allowed from 8:00 AM to 6:00 PM.";
  return "";
}
const clinicTimeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];
function to12Hour(time) {
  const [h, m] = time.split(":").map(Number);
  const s = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${s}`;
}
function renderTimeSlots(containerId, dateInputId) {
  const c = el(containerId),
    input = el(dateInputId);
  if (!c || !input) return;
  c.innerHTML = clinicTimeSlots
    .map(
      (t) =>
        `<button type="button" class="time-btn" onclick="applyTimeSlot('${dateInputId}','${t}','${containerId}')">${to12Hour(t)}</button>`,
    )
    .join("");
}
function applyTimeSlot(dateInputId, time, containerId) {
  const input = el(dateInputId);
  if (!input) return;
  const date = input.value ? input.value.split("T")[0] : formatDate(new Date());
  input.value = `${date}T${time}`;
  document
    .querySelectorAll(`#${containerId} .time-btn`)
    .forEach((b) => b.classList.remove("active"));
  [...document.querySelectorAll(`#${containerId} .time-btn`)]
    .find((b) => b.textContent.trim() === to12Hour(time))
    ?.classList.add("active");
}
function renderCalendarBase(
  gridId,
  titleId,
  currentDate,
  selectedDate,
  appointments,
  onSelect,
) {
  const grid = el(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  const y = currentDate.getFullYear(),
    m = currentDate.getMonth();
  if (el(titleId))
    el(titleId).textContent = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((day) => {
    const d = document.createElement("div");
    d.className = "day-name";
    d.textContent = day;
    grid.appendChild(d);
  });
  const first = new Date(y, m, 1),
    start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = formatDate(d);
    const cell = document.createElement("button");
    cell.className = "day-cell";
    if (d.getMonth() !== m) cell.classList.add("muted");
    if (formatDate(d) === formatDate(selectedDate))
      cell.classList.add("selected");
    if (formatDate(d) === formatDate(new Date())) cell.classList.add("today");
    if (!isWeekday(key)) cell.classList.add("weekend");
    const count = appointments.filter((a) => getDatePart(a) === key).length;
    cell.innerHTML = count
      ? `${d.getDate()}<br><small>${count} patient${count > 1 ? "s" : ""}</small>`
      : d.getDate();
    if (isWeekday(key)) cell.onclick = () => onSelect(d);
    grid.appendChild(cell);
  }
}

if (!currentUser || currentUser.role !== "admin" || !token)
  location.href = "index.html";
let patients = [],
  appointments = [],
  currentDate = new Date(),
  selectedDate = new Date();
function showAdminPage(id, btn) {
  showSection(id, btn);
  if (id === "appointments") renderAppointmentsPage();
  if (id === "patients") {
    renderPatients();
    renderTimeSlots("adminTimeSlots", "scheduleDate");
  }
  if (id === "notifications") renderNotifications();
}
async function loadAll() {
  patients = await apiFetch("/patients");
  appointments = await apiFetch("/appointments");
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
  el("todayCount").textContent = appointments.filter(
    (a) => getDatePart(a) === today,
  ).length;
  el("selectedCount").textContent = appointments.filter(
    (a) => getDatePart(a) === selected,
  ).length;
  el("monthCount").textContent = appointments.filter(
    (a) => getDatePart(a).slice(0, 7) === monthKey,
  ).length;
}
function renderCalendar() {
  renderCalendarBase(
    "calendarGrid",
    "calendarTitle",
    currentDate,
    selectedDate,
    appointments,
    (d) => {
      selectedDate = d;
      renderAppointmentsPage();
    },
  );
}
function renderSelectedAppointments() {
  const selected = formatDate(selectedDate),
    list = appointments.filter((a) => getDatePart(a) === selected);
  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString(
    "default",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );
  el("selectedAppointments").innerHTML = list.length
    ? list
        .map(
          (a) =>
            `<div class="notice"><strong>${a.patientName}</strong><br/>${getTimePart(a)} · ${a.status}</div>`,
        )
        .join("")
    : `<div class="notice">No appointments scheduled for this day.</div>`;
}
function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}
function renderPatients() {
  const table = el("patientTable");
  table.innerHTML = patients.length
    ? patients
        .map(
          (p) =>
            `<tr><td>${p.name || ""}</td><td>${p.email || ""}<br/>${p.phone || ""}</td><td>${p.condition || "General"}</td><td><button class="btn btn-secondary" onclick="selectPatientForSchedule('${p.id}')">Schedule</button> <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4">No patients yet.</td></tr>`;
  const s = el("schedulePatient");
  if (s)
    s.innerHTML =
      `<option value="">Select patient</option>` +
      patients
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
}
function selectPatientForSchedule(id) {
  const s = el("schedulePatient");
  if (s) s.value = id;
  el("scheduleDate")?.focus();
}
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
  ["addName", "addEmail", "addPhone", "addCondition", "addDiagnosis"].forEach(
    (id) => (el(id).value = ""),
  );
  await loadAll();
}
async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value,
    appointmentDate = el("scheduleDate").value,
    status = el("adminScheduleStatus");
  if (status) status.textContent = "";
  const err = validateScheduleDate(appointmentDate);
  if (err) return alert(err);
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return alert("Select a patient.");
  const res = await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify({
      patientId: patient.id,
      patientName: patient.name,
      appointmentDate,
      status: "Scheduled",
    }),
  });
  el("schedulePatient").value = "";
  el("scheduleDate").value = "";
  if (status)
    status.textContent = res.emailSent
      ? "Patient scheduled and email confirmation sent."
      : "Patient scheduled. Email was not sent. Check backend email setup.";
  await loadAll();
  showAdminPage("appointments", document.querySelector(".nav-btn"));
}
async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  await loadAll();
}
function renderNotifications() {
  const s = el("notificationPatient");
  if (!s) return;
  s.innerHTML =
    `<option value="">Select patient</option>` +
    patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}
async function sendEmailNotification() {
  const patientId = el("notificationPatient").value,
    subject = el("notificationSubject").value.trim() || "CareFlow Notification",
    message = el("notificationMessage").value.trim(),
    status = el("emailStatus");

  if (status) status.textContent = "";

  if (!patientId || !message)
    return alert("Select a patient and write a message.");

  const res = await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({ patientId, subject, message }),
  });

  if (status) {
    status.textContent = res.emailSent
      ? "✅ Email sent successfully."
      : "⚠️ Email request completed, but could not be sent. Check backend logs or Brevo credentials.";
    status.style.color = res.emailSent ? "green" : "orange";
  }

  // Clear form
  el("notificationSubject").value = "";
  el("notificationMessage").value = "";
}
loadAll().catch((e) => {
  console.error(e);
  alert("Failed to load admin data. Check backend connection.");
});
