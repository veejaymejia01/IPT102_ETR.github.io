// ==================== patient.js ====================
const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(localStorage.getItem("healthcare_user") || "null");

let appointments = [];
let profile = null;

// Sample Doctors with Specializations
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

// ==================== AUTH & NAV ====================
function logout() {
  localStorage.removeItem("healthcare_token");
  localStorage.removeItem("healthcare_user");
  window.location.href = "index.html";
}

function showPatientPage(id, btn) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  const section = el(id);
  if (section) section.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (id === "book") {
    renderTimeSlots("patientTimeSlots", "appointmentDate");
    loadSpecializations();
  }
}

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

// ==================== LOAD DATA ====================
async function loadAll() {
  try {
    appointments = await apiFetch("/patient/appointments");
    profile = await apiFetch("/patient/profile");
  } catch (e) {
    console.error("Failed to load data", e);
  }
  render();
}

function render() {
  // Welcome name
  if (el("patientName") && profile) {
    el("patientName").textContent = profile.name || currentUser?.name || "Patient";
  }

  // Next Appointment
  const next = appointments.find(a => a.status !== "Done");
  if (el("nextAppointmentBox")) {
    el("nextAppointmentBox").innerHTML = next 
      ? `<strong>Next Appointment:</strong><br>${next.appointmentDate} with ${next.doctorName || "Doctor"}`
      : "No upcoming appointments.";
  }

  // Appointments Table
  const table = el("appointmentTable");
  if (table) {
    let html = `<tr><th>Date & Time</th><th>Doctor</th><th>Status</th></tr>`;
    if (appointments.length === 0) {
      html += `<tr><td colspan="3">No appointments yet.</td></tr>`;
    } else {
      html += appointments.map(a => `
        <tr>
          <td>${a.appointmentDate}</td>
          <td>${a.doctorName || "General Doctor"}</td>
          <td>${a.status}</td>
        </tr>
      `).join("");
    }
    table.innerHTML = html;
  }

  // Profile
  if (el("profileBox") && profile) {
    el("profileBox").innerHTML = `
      <h3>${profile.name}</h3>
      <p><strong>Email:</strong> ${profile.email || "N/A"}</p>
      <p><strong>Phone:</strong> ${profile.phone || "N/A"}</p>
      <p><strong>Condition:</strong> ${profile.condition || "General"}</p>
      <p><strong>Diagnosis:</strong> ${profile.diagnosis || "Pending assessment"}</p>
    `;
  }
}

// ==================== DOCTOR SPECIALIZATION ====================
function loadSpecializations() {
  const specs = [...new Set(doctors.map(d => d.specialization))];
  const select = el("specializationSelect");
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
  const spec = el("specializationSelect").value;
  const doctorSelect = el("doctorSelect");
  if (!doctorSelect) return;

  doctorSelect.innerHTML = `<option value="">Select Doctor</option>`;

  if (!spec) return;

  const filteredDoctors = doctors.filter(d => d.specialization === spec);
  filteredDoctors.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = doc.name;
    doctorSelect.appendChild(opt);
  });
}

// ==================== BOOK APPOINTMENT ====================
async function bookAppointment() {
  const appointmentDate = el("appointmentDate").value;
  const doctorId = el("doctorSelect").value;
  const statusEl = el("patientScheduleStatus");

  if (!appointmentDate) {
    alert("Please select date and time");
    return;
  }
  if (!doctorId) {
    alert("Please select a doctor");
    return;
  }

  const selectedDoctor = doctors.find(d => d.id === doctorId);

  try {
    const res = await apiFetch("/patient/appointments", {
      method: "POST",
      body: JSON.stringify({
        appointmentDate,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name
      })
    });

    statusEl.style.color = "green";
    statusEl.textContent = `✅ Appointment booked successfully with ${selectedDoctor.name}`;

    // Reset form
    el("appointmentDate").value = "";
    el("doctorSelect").value = "";
    el("specializationSelect").value = "";

    await loadAll();
    showPatientPage("appointments");
  } catch (e) {
    console.error(e);
    alert("Failed to book appointment. Please try again.");
  }
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
  const container = el(containerId);
  const input = el(dateInputId);
  if (!container || !input) return;

  container.innerHTML = clinicTimeSlots.map(t => `
    <button type="button" class="time-btn" onclick="applyTimeSlot('${dateInputId}','${t}','${containerId}')">
      ${to12Hour(t)}
    </button>
  `).join("");
}

function applyTimeSlot(dateInputId, time, containerId) {
  const input = el(dateInputId);
  if (!input) return;

  let date = input.value ? input.value.split("T")[0] : new Date().toISOString().split("T")[0];
  input.value = `${date}T${time}`;

  // Highlight active button
  document.querySelectorAll(`#${containerId} .time-btn`).forEach(btn => {
    btn.classList.toggle("active", btn.textContent.trim() === to12Hour(time));
  });
}

// ==================== HELPERS ====================
function isWeekday(dateString) {
  const d = new Date(dateString);
  return d.getDay() >= 1 && d.getDay() <= 5;
}

function validateScheduleDate(dateString) {
  if (!dateString) return "Please select date and time";
  if (!isWeekday(dateString)) return "Appointments only Monday to Friday";
  return "";
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "patient") {
    window.location.href = "index.html";
    return;
  }

  loadAll().catch(console.error);
});
