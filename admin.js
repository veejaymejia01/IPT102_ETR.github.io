const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token");

async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Load Overview (All Appointments)
async function loadOverview() {
  const data = await apiFetch("/appointments");
  document.getElementById("overview-content").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

// Load Specializations + Appointments per Spec
async function loadSpecializations() {
  const specs = await apiFetch("/specializations");
  let html = "";
  for (const spec of specs) {
    html += `
      <div class="spec-card">
        <h3>${spec.name}</h3>
        <button onclick="loadAppointmentsBySpec('${spec.id}')">View Appointments</button>
      </div>`;
  }
  document.getElementById("specializations-content").innerHTML = html;
}

async function loadAppointmentsBySpec(specId) {
  const data = await apiFetch(`/appointments/specialization/${specId}`);
  alert(JSON.stringify(data, null, 2)); // Replace with nice table in production
}

// Patients List
async function loadPatients() {
  const data = await apiFetch("/patients");
  document.getElementById("patients-content").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadSpecializations();
  loadPatients();
});
