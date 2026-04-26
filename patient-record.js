const API = "https://etr-backend.onrender.com/api";
const token = localStorage.getItem("healthcare_token") || "";
const params = new URLSearchParams(window.location.search);
const patientId = params.get("id");
const fromPage = params.get("from") || "doctor";
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
async function loadPatient() {
  const patients = await apiFetch("/patients");
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;
  document.getElementById("editPatientName").value = patient.name || "";
  document.getElementById("editPatientEmail").value = patient.email || "";
  document.getElementById("editPatientPhone").value = patient.phone || "";
  document.getElementById("editPatientCondition").value =
    patient.condition || "";
  document.getElementById("editPatientDiagnosis").value =
    patient.diagnosis || "";
}
async function savePatient() {
  await apiFetch(`/patients/${patientId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: document.getElementById("editPatientName").value.trim(),
      email: document.getElementById("editPatientEmail").value.trim() || null,
      phone: document.getElementById("editPatientPhone").value.trim() || null,
      condition:
        document.getElementById("editPatientCondition").value.trim() || null,
      diagnosis:
        document.getElementById("editPatientDiagnosis").value.trim() || null,
    }),
  });
  alert("Saved!");
}
function goBack() {
  window.location.href =
    fromPage === "admin" ? "admin-dashboard.html" : "doctor-dashboard.html";
}
loadPatient().catch(console.error);
