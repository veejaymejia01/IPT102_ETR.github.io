const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

if (!currentUser || currentUser.role !== "admin" || !token) {
  window.location.href = "index.html";
}

let patients = [];
let appointments = [];
let currentDate = new Date();
let selectedDate = new Date();
let selectedPatientId = null;

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

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function showSection(id, btn = null) {
  document.querySelectorAll("main section").forEach((section) => {
    section.classList.add("hidden");
  });

  const target = el(id);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((nav) => {
    nav.classList.remove("active");
  });

  if (btn) btn.classList.add("active");
}

function showAdminPage(id, btn) {
  showSection(id, btn);

  if (id === "appointments") renderAppointmentsPage();

  if (id === "patients") {
    renderPatients();
    renderTimeSlots("adminTimeSlots", "scheduleDate");
  }

  if (id === "notifications") renderNotifications();
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
  const date = new Date(dateString);
  const day = date.getDay();

  return day >= 1 && day <= 5;
}

function isBusinessHour(dateString) {
  const date = new Date(dateString);
  const hour = date.getHours();
  const minute = date.getMinutes();

  return hour >= 8 && (hour < 18 || (hour === 18 && minute === 0));
}

function validateScheduleDate(dateString) {
  if (!dateString) return "Select appointment date and time.";
  if (!isWeekday(dateString)) return "Appointments are only allowed Monday to Friday.";
  if (!isBusinessHour(dateString)) return "Appointments are only allowed from 8:00 AM to 6:00 PM.";

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
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function renderTimeSlots(containerId, dateInputId) {
  const container = el(containerId);
  const input = el(dateInputId);

  if (!container || !input) return;

  container.innerHTML = clinicTimeSlots
    .map((time) => {
      return `
        <button
          type="button"
          class="time-btn"
          onclick="applyTimeSlot('${dateInputId}', '${time}', '${containerId}')"
        >
          ${to12Hour(time)}
        </button>
      `;
    })
    .join("");
}

function applyTimeSlot(dateInputId, time, containerId) {
  const input = el(dateInputId);
  if (!input) return;

  const current = input.value;
  const date = current ? current.split("T")[0] : formatDate(new Date());

  input.value = `${date}T${time}`;

  document.querySelectorAll(`#${containerId} .time-btn`).forEach((btn) => {
    btn.classList.remove("active");
  });

  [...document.querySelectorAll(`#${containerId} .time-btn`)]
    .find((btn) => btn.textContent.trim() === to12Hour(time))
    ?.classList.add("active");
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

  const today = formatDate(new Date());
  const selected = formatDate(selectedDate);
  const monthKey = selected.slice(0, 7);

  el("todayCount").textContent = appointments.filter((appointment) => {
    return getDatePart(appointment) === today;
  }).length;

  el("selectedCount").textContent = appointments.filter((appointment) => {
    return getDatePart(appointment) === selected;
  }).length;

  el("monthCount").textContent = appointments.filter((appointment) => {
    return getDatePart(appointment).slice(0, 7) === monthKey;
  }).length;
}

function renderCalendar() {
  const grid = el("calendarGrid");
  grid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  el("calendarTitle").textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((day) => {
    const dayName = document.createElement("div");
    dayName.className = "day-name";
    dayName.textContent = day;
    grid.appendChild(dayName);
  });

  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const cell = document.createElement("button");
    const dateKey = formatDate(date);

    cell.className = "day-cell";

    if (date.getMonth() !== month) {
      cell.classList.add("muted");
    }

    if (dateKey === formatDate(selectedDate)) {
      cell.classList.add("selected");
    }

    if (dateKey === formatDate(new Date())) {
      cell.classList.add("today");
    }

    if (!isWeekday(dateKey)) {
      cell.classList.add("weekend");
    }

    const count = appointments.filter((appointment) => {
      return getDatePart(appointment) === dateKey;
    }).length;

    cell.innerHTML = count
      ? `${date.getDate()}<br><small>${count} patient${count > 1 ? "s" : ""}</small>`
      : date.getDate();

    if (isWeekday(dateKey)) {
      cell.onclick = () => {
        selectedDate = date;
        renderAppointmentsPage();
      };
    }

    grid.appendChild(cell);
  }
}

function renderSelectedAppointments() {
  const selected = formatDate(selectedDate);

  const selectedAppointments = appointments.filter((appointment) => {
    return getDatePart(appointment) === selected;
  });

  el("selectedDateTitle").textContent = selectedDate.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  el("selectedAppointments").innerHTML = selectedAppointments.length
    ? selectedAppointments
        .map((appointment) => {
          return `
            <div class="notice">
              <strong>${appointment.patientName}</strong><br />
              ${getTimePart(appointment)} · ${appointment.status}
            </div>
          `;
        })
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
        .map((patient) => {
          return `
            <tr
              class="patient-row ${selectedPatientId === patient.id ? "active" : ""}"
              onclick="viewPatient('${patient.id}', event)"
              style="cursor:pointer;"
            >
              <td>${patient.name || ""}</td>
              <td>
                ${patient.email || ""}<br />
                ${patient.phone || ""}
              </td>
              <td>${patient.condition || "General"}</td>
              <td>
                <button
                  class="btn btn-secondary"
                  onclick="event.stopPropagation(); viewPatient('${patient.id}')"
                >
                  View
                </button>
                <button
                  class="btn btn-secondary"
                  onclick="event.stopPropagation(); selectPatientForSchedule('${patient.id}')"
                >
                  Schedule
                </button>
                <button
                  class="btn btn-danger"
                  onclick="event.stopPropagation(); deletePatient('${patient.id}')"
                >
                  Delete
                </button>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4">No patients yet.</td></tr>`;

  const scheduleSelect = el("schedulePatient");

  if (scheduleSelect) {
    scheduleSelect.innerHTML =
      `<option value="">Select patient</option>` +
      patients
        .map((patient) => {
          return `<option value="${patient.id}">${patient.name}</option>`;
        })
        .join("");
  }
}

function viewPatient(id, event = null) {
  selectedPatientId = id;

  const patient = patients.find((item) => item.id === id);
  if (!patient) return;

  document.querySelectorAll(".patient-row").forEach((row) => {
    row.classList.remove("active");
  });

  if (event?.currentTarget) {
    event.currentTarget.classList.add("active");
  }

  const box = el("patientDetails");
  const content = el("patientDetailsContent");

  if (!box || !content) return;

  box.classList.remove("hidden");

  content.innerHTML = `
    <div class="record-grid">
      <div>
        <span>Name</span>
        <strong>${patient.name || "-"}</strong>
      </div>

      <div>
        <span>Email</span>
        <strong>${patient.email || "-"}</strong>
      </div>

      <div>
        <span>Phone</span>
        <strong>${patient.phone || "-"}</strong>
      </div>

      <div>
        <span>Condition</span>
        <strong>${patient.condition || "General"}</strong>
      </div>

      <div class="record-full">
        <span>Diagnosis / Notes</span>
        <strong>${patient.diagnosis || "Pending assessment"}</strong>
      </div>

      <div class="record-full">
        <span>Patient ID</span>
        <strong>${patient.id || "-"}</strong>
      </div>
    </div>
  `;
}

function selectPatientForSchedule(patientId) {
  const scheduleSelect = el("schedulePatient");

  if (scheduleSelect) {
    scheduleSelect.value = patientId;
  }

  const scheduleDate = el("scheduleDate");

  if (scheduleDate) {
    scheduleDate.focus();
  }

  viewPatient(patientId);
}

async function submitNewPatient() {
  const body = {
    name: el("addName").value.trim(),
    email: el("addEmail").value.trim(),
    phone: el("addPhone").value.trim(),
    condition: el("addCondition").value.trim() || "General",
    diagnosis: el("addDiagnosis").value.trim() || "Pending assessment",
  };

  if (!body.name) {
    alert("Patient name is required.");
    return;
  }

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

async function scheduleSelectedPatient() {
  const patientId = el("schedulePatient").value;
  const appointmentDate = el("scheduleDate").value;
  const status = el("adminScheduleStatus");

  if (status) status.textContent = "";

  const validationError = validateScheduleDate(appointmentDate);

  if (validationError) {
    alert(validationError);
    return;
  }

  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    alert("Select a patient.");
    return;
  }

  const response = await apiFetch("/appointments", {
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

  if (status) {
    status.textContent = response.emailSent
      ? "Patient scheduled and email confirmation sent."
      : "Patient scheduled. Email was not sent. Check backend email setup.";
  }

  await loadAll();

  showAdminPage("appointments", document.querySelector(".nav-btn"));
}

async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;

  await apiFetch(`/patients/${id}`, {
    method: "DELETE",
  });

  if (selectedPatientId === id) {
    selectedPatientId = null;

    const details = el("patientDetails");
    if (details) details.classList.add("hidden");
  }

  await loadAll();
}

function renderNotifications() {
  const select = el("notificationPatient");

  if (!select) return;

  select.innerHTML =
    `<option value="">Select patient</option>` +
    patients
      .map((patient) => {
        return `<option value="${patient.id}">${patient.name}</option>`;
      })
      .join("");
}

async function sendEmailNotification() {
  const patientId = el("notificationPatient").value;
  const subject = el("notificationSubject").value.trim() || "Healthcare Notification";
  const message = el("notificationMessage").value.trim();
  const status = el("emailStatus");

  if (status) status.textContent = "";

  if (!patientId || !message) {
    alert("Select patient and write a message.");
    return;
  }

  const result = await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({
      patientId,
      subject,
      message,
    }),
  });

  if (status) {
    status.textContent = result.emailSent
      ? "Email sent successfully."
      : "Email request completed, but email provider did not send. Check RESEND_API_KEY or verified recipient/domain.";
  }

  el("notificationSubject").value = "";
  el("notificationMessage").value = "";
}

loadAll().catch((error) => {
  console.error(error);
  alert("Failed to load admin data. Check backend connection.");
});
