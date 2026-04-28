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

if (!currentUser || currentUser.role !== "patient" || !token) window.location.href = "index.html";

let appointments = [];
let profile = null;

function showPatientPage(id, btn) {
  showSection(id, btn);
  render();
}

async function loadAll() {
  appointments = await apiFetch("/patient/appointments");
  profile = await apiFetch("/patient/profile");
  render();
}

function render() {
  const next = appointments.find((a) => a.status !== "Done");

  if (el("nextAppointmentBox")) {
    el("nextAppointmentBox").innerHTML = next
      ? `<strong>${next.appointmentDate}</strong><br>${next.status}`
      : "No upcoming appointment.";
  }

  if (el("appointmentTable")) {
    el("appointmentTable").innerHTML = appointments.length
      ? appointments.map((a) => `<tr><td>${a.appointmentDate}</td><td>${a.status}</td></tr>`).join("")
      : `<tr><td colspan="2">No appointments yet.</td></tr>`;
  }

  if (el("profileBox") && profile) {
    el("profileBox").innerHTML = `
      <strong>${profile.name || ""}</strong><br>
      Email: ${profile.email || "No email"}<br>
      Phone: ${profile.phone || "N/A"}<br>
      Condition: ${profile.condition || "General"}<br>
      Diagnosis: ${profile.diagnosis || "Pending assessment"}
    `;
  }
}

async function bookAppointment() {
  const appointmentDate = el("appointmentDate").value;
  if (!appointmentDate) return alert("Select date and time.");

  await apiFetch("/patient/appointments", {
    method: "POST",
    body: JSON.stringify({ appointmentDate }),
  });

  el("appointmentDate").value = "";
  await loadAll();
  showSection("appointments");
}

loadAll().catch((error) => {
  console.error(error);
  alert("Failed to load patient dashboard. Check backend connection.");
});
