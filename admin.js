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
  if (section === 'specializations') loadSpecializations();
  if (section === 'patients') loadPatients();
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
      color: "#3b82f6"
    })),
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" },
    eventClick: function(info) {
      alert(`Appointment: ${info.event.title}\nDate: ${info.event.start}`);
    }
  });
  calendar.render();
}

// Specializations
async function loadSpecializations() {
  const specs = await apiFetch("/specializations");
  let html = "";
  for (const spec of specs) {
    html += `
      <div class="bg-white p-6 rounded-3xl shadow hover:shadow-xl transition cursor-pointer" onclick="loadAppointmentsBySpec('${spec.id}')">
        <h3 class="font-semibold text-xl">${spec.name}</h3>
        <p class="text-gray-500 text-sm mt-1">${spec.description || ''}</p>
      </div>`;
  }
  document.getElementById("specializations-content").innerHTML = html;
}

async function loadAppointmentsBySpec(specId) {
  const data = await apiFetch(`/appointments/specialization/${specId}`);
  alert(JSON.stringify(data, null, 2)); // Replace with nice modal in production
}

// Patients
async function loadPatients() {
  const data = await apiFetch("/patients");
  let html = `<table class="w-full"><thead class="bg-gray-100"><tr><th class="text-left p-4">Name</th><th class="text-left p-4">Email</th><th class="text-left p-4">Phone</th></tr></thead><tbody>`;
  for (const p of data) {
    html += `<tr class="border-b hover:bg-gray-50"><td class="p-4">${p.name}</td><td class="p-4">${p.email || '-'}</td><td class="p-4">${p.phone || '-'}</td></tr>`;
  }
  html += `</tbody></table>`;
  document.getElementById("patients-content").innerHTML = html;
}

function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// Init
window.onload = () => showSection('calendar');
