const API = "https://etr-backend.onrender.com/api";

const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(
  localStorage.getItem("healthcare_user") || "null",
);
let patients = [],
  appointments = [],
  selectedDate = new Date().toISOString().split("T")[0],
  calendar = null;
if (!currentUser || currentUser.role !== "doctor" || !token)
  window.location.href = "index.html";
function el(id) {
  return document.getElementById(id);
}
function setActiveNav(btn) {
  document
    .querySelectorAll(".nav-btn")
    .forEach((n) => n.classList.remove("active"));
  if (btn) btn.classList.add("active");
}
function showSection(id, btn = null) {
  document
    .querySelectorAll("main section")
    .forEach((s) => s.classList.add("hidden"));
  const t = el(id);
  if (t) t.classList.remove("hidden");
  setActiveNav(btn);
  if (id === "dashboard") renderTodayAppointments();
  if (id === "appointments") {
    renderSelectedDayAppointments();
    if (calendar) setTimeout(() => calendar.updateSize(), 50);
  }
  if (id === "patients") renderPatients();
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
  let d = null;
  try {
    d = await r.json();
  } catch {}
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d;
}
async function loadAll() {
  patients = await apiFetch("/patients");
  appointments = await apiFetch("/appointments");
  renderAll();
}
function renderAll() {
  if (el("welcomeText"))
    el("welcomeText").innerText = `Welcome, ${currentUser.email}`;
  renderTodayAppointments();
  renderPatients();
  initCalendar();
  renderSelectedDayAppointments();
  setTimeout(() => highlightSelectedDate(), 100);
}
function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}
function getDatePart(item) {
  const raw = String(item.appointmentDate || "");
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
}
function getTimePart(item) {
  const raw = String(item.appointmentDate || "");
  if (!raw) return "";
  if (raw.includes("T")) return raw.split("T")[1].slice(0, 5);
  if (raw.includes(" ")) return raw.split(" ")[1] || "";
  return raw;
}
function getHour(item) {
  const m = getTimePart(item).match(/(\d{2}):(\d{2})/);
  return m ? Number(m[1]) : null;
}
function renderSlot(containerId, items, showDoneButton = false) {
  const c = el(containerId);
  if (!c) return;
  if (!items.length) {
    c.innerHTML = '<div class="sub-text">No appointments</div>';
    return;
  }
  c.innerHTML = items
    .map(
      (i) =>
        `<div class="appt-item"><div class="appt-time">${getTimePart(i)}</div><div class="appt-main"><strong>${i.patientName}</strong><div class="appt-meta">${i.status || "Scheduled"}</div></div><div>${showDoneButton && i.status !== "Done" ? `<button class="btn btn-primary inline-btn" onclick="markAppointmentDone('${i.id}')">Done</button>` : `<span class="status ${String(i.status || "").toLowerCase() === "done" ? "done" : "scheduled"}">${i.status || "Scheduled"}</span>`}</div></div>`,
    )
    .join("");
}
function renderTodayAppointments() {
  const today = getTodayDateString();
  const todayAppointments = appointments.filter(
    (a) => getDatePart(a) === today,
  );
  renderSlot(
    "todayMorningAppointmentList",
    todayAppointments.filter((a) => {
      const h = getHour(a);
      return h !== null && h < 12;
    }),
    false,
  );
  renderSlot(
    "todayAfternoonAppointmentList",
    todayAppointments.filter((a) => {
      const h = getHour(a);
      return h !== null && h >= 12;
    }),
    false,
  );
}
function renderPatientScheduleList(containerId, items) {
  const c = el(containerId);
  if (!c) return;
  if (!items.length) {
    c.innerHTML = '<div class="sub-text">No patients scheduled</div>';
    return;
  }
  c.innerHTML = items
    .map(
      (i) =>
        `<div class="appt-item"><div class="appt-time">${getTimePart(i)}</div><div class="appt-main"><strong>${i.patientName}</strong><div class="appt-meta">${i.status || "Scheduled"}</div></div><div>${i.status !== "Done" ? `<button class="btn btn-primary inline-btn" onclick="markAppointmentDone('${i.id}')">Done</button>` : `<span class="status done">Done</span>`}</div></div>`,
    )
    .join("");
}
function renderSelectedDayAppointments() {
  const s = String(el("appointmentSearch")?.value || "").toLowerCase();
  const selectedAppointments = appointments.filter((a) => {
    const sameDay = getDatePart(a) === selectedDate;
    const patient = String(a.patientName || "").toLowerCase();
    const date = String(a.appointmentDate || "").toLowerCase();
    const status = String(a.status || "").toLowerCase();
    return (
      sameDay && (patient.includes(s) || date.includes(s) || status.includes(s))
    );
  });
  if (el("selectedDateTitle"))
    el("selectedDateTitle").innerText = `Patient Schedule for ${selectedDate}`;
  renderPatientScheduleList(
    "selectedMorningAppointmentList",
    selectedAppointments.filter((a) => {
      const h = getHour(a);
      return h !== null && h < 12;
    }),
  );
  renderPatientScheduleList(
    "selectedAfternoonAppointmentList",
    selectedAppointments.filter((a) => {
      const h = getHour(a);
      return h !== null && h >= 12;
    }),
  );
  if (el("appointmentTable"))
    el("appointmentTable").innerHTML = selectedAppointments
      .map(
        (a) =>
          `<tr><td>${a.patientName}</td><td>${getTimePart(a)}</td><td>${a.status || "Scheduled"}</td></tr>`,
      )
      .join("");
}
function buildCalendarEvents() {
  const g = {};
  appointments.forEach((a) => {
    const d = getDatePart(a);
    if (!g[d]) g[d] = 0;
    g[d] += 1;
  });
  return Object.keys(g).map((date) => ({
    title: `${g[date]} patient${g[date] > 1 ? "s" : ""}`,
    date,
  }));
}
function highlightSelectedDate() {
  const today = getTodayDateString();
  document
    .querySelectorAll(".fc-daygrid-day")
    .forEach((day) =>
      day.classList.remove("selected-day", "today-day", "past-day"),
    );
  document.querySelectorAll(".fc-daygrid-day").forEach((day) => {
    const d = day.getAttribute("data-date");
    if (!d) return;
    if (d < today) {
      day.classList.add("past-day");
      return;
    }
    if (d === today) day.classList.add("today-day");
    if (d === selectedDate) day.classList.add("selected-day");
  });
}
function initCalendar() {
  const calendarEl = el("calendar");
  if (!calendarEl || typeof FullCalendar === "undefined") return;
  if (calendar) calendar.destroy();
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth",
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
    },
  });
  calendar.render();
}
function goToTodaySchedule() {
  selectedDate = getTodayDateString();
  renderSelectedDayAppointments();
  if (calendar) {
    calendar.today();
    setTimeout(() => highlightSelectedDate(), 0);
  }
}
function getStatus(p) {
  if (!p.diagnosis) return { label: "Pending", class: "pending" };
  const x = String(p.diagnosis).toLowerCase();
  if (
    x.includes("critical") ||
    x.includes("pneumonia") ||
    x.includes("emergency")
  )
    return { label: "Critical", class: "critical" };
  if (x.includes("follow") || x.includes("check") || x.includes("hypertension"))
    return { label: "Follow-up", class: "warning" };
  return { label: "Stable", class: "stable" };
}
function openPatient(id) {
  window.location.href = `patient-record.html?id=${id}&from=doctor`;
}
function renderPatients() {
  const t = el("patientTable");
  if (!t) return;
  const s = String(el("patientSearch")?.value || "").toLowerCase();
  const f = patients.filter((p) =>
    [p.name, p.email, p.phone, p.condition, p.diagnosis].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(s),
    ),
  );
  t.innerHTML = f
    .map((p) => {
      const st = getStatus(p);
      return `<tr class="patient-row"><td><strong>${p.name || ""}</strong><br><span class="sub-text">${p.email || "No email"}</span></td><td>${p.phone || "N/A"}</td><td>${p.condition || "General"}</td><td><span class="badge ${st.class}">${st.label}</span><br><span class="sub-text">${p.diagnosis || "Pending assessment"}</span></td><td><button class="btn btn-secondary small-btn" onclick="openPatient('${p.id}')">Edit</button></td></tr>`;
    })
    .join("");
}
async function markAppointmentDone(id) {
  await apiFetch(`/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Done" }),
  });
  await loadAll();
}
loadAll().catch((e) => {
  console.error(e);
  alert("Failed to load doctor data. Check backend connection.");
});
