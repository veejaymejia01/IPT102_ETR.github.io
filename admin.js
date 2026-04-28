const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

function el(id) {
  return document.getElementById(id);
}

function logout() {
  localStorage.removeItem("healthcare_token");
  localStorage.removeItem("healthcare_user");
  window.location.href = "index.html";
}

async function apiFetch(url, options = {}) {
  const response = await fetch(API + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function showSection(id, btn = null) {
  document.querySelectorAll("main section").forEach((section) => section.classList.add("hidden"));
  const target = el(id);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((nav) => nav.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

if (!currentUser || currentUser.role !== "admin" || !token) window.location.href = "index.html";

let patients = [];
let appointments = [];
let currentDate = new Date();
let selectedDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getDatePart(item) {
  const raw = String(item.appointmentDate || "");
  return raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
}

function showAdminPage(id, btn) {
  showSection(id, btn);
  if (id === "appointments") renderAppointmentsPage();
  if (id === "patients") renderPatients();
  if (id === "notifications") renderNotifications();
}

async function loadAll() {
  patients = await apiFetch("/patients");
  appointments = await apiFetch("/appointments");
  renderAppointmentsPage();
  renderPatients();
  renderNotifications();
}

function renderAppointmentsPage() {
  renderCalendar();
  renderSelectedAppointments();

  const today = formatDate(new Date());
  const selected = formatDate(selectedDate);
  const ym = selected.slice(0, 7);

  el("todayCount").textContent = appointments.filter((a) => getDatePart(a) === today).length;
  el("selectedCount").textContent = appointments.filter((a) => getDatePart(a) === selected).length;
  el("monthCount").textContent = appointments.filter((a) => getDatePart(a).slice(0, 7) === ym).length;
}

function renderCalendar() {
  const grid = el("calendarGrid");
  grid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  el("calendarTitle").textContent = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((day) => {
    const d = document.createElement("div");
    d.className = "day-name";
    d.textContent = day;
    grid.appendChild(d);
  });

  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const cell = document.createElement("button");
    cell.className = "day-cell";
    if (d.getMonth() !== month) cell.classList.add("muted");
    if (formatDate(d) === formatDate(selectedDate)) cell.classList.add("selected");
    if (formatDate(d) === formatDate(new Date())) cell.classList.add("today");

    const count = appointments.filter((a) => getDatePart(a) === formatDate(d)).length;
    cell.innerHTML = count ? `${d.getDate()}<br><small>${count} patient${count > 1 ? "s" : ""}</small>` : d.getDate();

    cell.onclick = () => {
      selectedDate = d;
      renderAppointmentsPage();
    };

    grid.appendChild(cell);
  }
}

function renderSelectedAppointments() {
  const selected = formatDate(selectedDate);
  const list = appointments.filter((a) => getDatePart(a) === selected);

  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  el("selectedAppointments").innerHTML = list.length
    ? list.map((a) => `<div class="notice"><strong>${a.patientName}</strong><br>${a.appointmentDate} · ${a.status}</div><br>`).join("")
    : `<div class="notice">No appointments scheduled for this day.</div>`;
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

function goToToday() {
  selectedDate = new Date();
  currentDate = new Date();
  renderAppointmentsPage();
}

function renderPatients() {
  const table = el("patientTable");
  table.innerHTML = patients.length
    ? patients.map((p) => `
      <tr>
        <td>${p.name || ""}</td>
        <td>${p.email || ""}<br>${p.phone || ""}</td>
        <td>${p.condition || "General"}</td>
        <td>
          <button class="btn btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">No patients yet.</td></tr>`;
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

  await apiFetch("/patients", {
    method: "POST",
    body: JSON.stringify(body),
  });

  el("addName").value = "";
  el("addEmail").value = "";
  el("addPhone").value = "";
  el("addCondition").value = "";
  el("addDiagnosis").value = "";

  await loadAll();
}

async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  await loadAll();
}

function renderNotifications() {
  const select = el("notificationPatient");
  if (!select) return;
  select.innerHTML = `<option value="">Select patient</option>` + patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function sendEmailNotification() {
  const patientId = el("notificationPatient").value;
  const subject = el("notificationSubject").value.trim() || "Healthcare Notification";
  const message = el("notificationMessage").value.trim();

  if (!patientId || !message) return alert("Select patient and write a message.");

  await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({ patientId, subject, message }),
  });

  alert("Email sent.");
  el("notificationSubject").value = "";
  el("notificationMessage").value = "";
}

loadAll().catch((error) => {
  console.error(error);
  alert("Failed to load admin data. Check backend connection.");
});
