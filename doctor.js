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

// My Appointments
async function loadMyAppointments() {
  const data = await apiFetch("/appointments");
  document.getElementById("my-appointments-content").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

// Book Appointment
async function bookAppointment() {
  const patientName = document.getElementById("patientName").value;
  const appointmentDate = document.getElementById("appointmentDate").value;
  const specialization_id = document.getElementById("specializationSelect").value;

  if (!patientName || !appointmentDate) return alert("Fill all fields");

  const res = await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify({ patientName, appointmentDate, specialization_id })
  });
  alert("Appointment booked!");
  loadMyAppointments();
}

// My Patients (CRUD)
async function loadMyPatients() {
  const data = await apiFetch("/patients");
  let html = "<table><tr><th>Name</th><th>Email</th><th>Actions</th></tr>";
  for (const p of data) {
    html += `<tr><td>${p.name}</td><td>${p.email}</td>
      <td><button onclick="editPatient('${p.id}')">Edit</button>
      <button onclick="deletePatient('${p.id}')">Delete</button></td></tr>`;
  }
  html += "</table>";
  document.getElementById("my-patients-content").innerHTML = html;
}

async function addPatient() {
  const name = prompt("Patient Name");
  if (!name) return;
  await apiFetch("/patients", { method: "POST", body: JSON.stringify({ name }) });
  loadMyPatients();
}

async function deletePatient(id) {
  if (!confirm("Delete patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  loadMyPatients();
}

// Send Email
async function sendEmail() {
  const patientId = document.getElementById("emailPatientSelect").value;
  const subject = document.getElementById("emailSubject").value;
  const message = document.getElementById("emailMessage").value;
  await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({ patientId, subject, message })
  });
  alert("Email request sent!");
}

function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadMyAppointments();
  loadMyPatients();
});
