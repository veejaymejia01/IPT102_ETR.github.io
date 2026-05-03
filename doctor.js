const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token");

async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

let calendar;

// Show section
function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(section).classList.remove('hidden');
  if (section === 'calendar') loadCalendar();
}

// Calendar
async function loadCalendar() {
  const events = await apiFetch("/appointments");
  if (calendar) calendar.destroy();
  calendar = new FullCalendar.Calendar(document.getElementById("calendar-container"), {
    initialView: "dayGridMonth",
    events: events.map(a => ({
      title: a.patient_name,
      start: a.appointment_date,
      color: "#10b981"
    })),
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }
  });
  calendar.render();
}

// Book Appointment
async function bookAppointment() {
  const patientName = document.getElementById("patientName").value;
  const appointmentDate = document.getElementById("appointmentDate").value;
  if (!patientName || !appointmentDate) return alert("Please fill all fields");
  await apiFetch("/appointments", { method: "POST", body: JSON.stringify({ patientName, appointmentDate }) });
  alert("Appointment booked!");
  loadCalendar();
}

// Patients
async function loadPatients() {
  const data = await apiFetch("/patients");
  let html = `<table class="w-full"><thead class="bg-gray-100"><tr><th class="text-left p-4">Name</th><th class="text-left p-4">Email</th><th>Actions</th></tr></thead><tbody>`;
  for (const p of data) {
    html += `<tr class="border-b"><td class="p-4">${p.name}</td><td class="p-4">${p.email || '-'}</td><td><button onclick="alert('Edit ${p.name}')" class="text-blue-600">Edit</button></td></tr>`;
  }
  html += `</tbody></table>`;
  document.getElementById("patients-content").innerHTML = html;
}

async function addPatient() {
  const name = prompt("Patient Name");
  if (!name) return;
  await apiFetch("/patients", { method: "POST", body: JSON.stringify({ name }) });
  loadPatients();
}

function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// Init
window.onload = () => showSection('calendar');
