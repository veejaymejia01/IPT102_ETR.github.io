const API = 'https://etr-backend.onrender.com/api';

const token = localStorage.getItem("healthcare_token") || "";
const currentUser = JSON.parse(
  localStorage.getItem("healthcare_user") || "null",
);
let patients = [],
  appointments = [],
  bills = [],
  notifications = [],
  selectedPatientId = null;
if (!currentUser || currentUser.role !== "admin" || !token)
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
  if (id === "dashboard") renderDashboard();
  if (id === "appointments") renderAppointments();
  if (id === "patients") {
    renderPatients();
    renderRecordDetails();
  }
  if (id === "notifications") renderNotifications();
  if (id === "billing") renderBilling();
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
  bills = await apiFetch("/billing/invoices");
  notifications = await apiFetch("/notifications");
  if (!selectedPatientId && patients.length) selectedPatientId = patients[0].id;
  renderAll();
}
function renderAll() {
  renderDashboard();
  renderAppointments();
  renderPatients();
  renderBilling();
  renderNotifications();
  renderRecordDetails();
}
function renderDashboard() {
  if (el("welcomeText"))
    el("welcomeText").innerText = `Welcome, ${currentUser.email}`;
  if (el("patientCount"))
    el("patientCount").innerText = String(patients.length);
  if (el("appointmentCount"))
    el("appointmentCount").innerText = String(appointments.length);
  if (el("billCount")) el("billCount").innerText = String(bills.length);
  if (el("notificationCount"))
    el("notificationCount").innerText = String(notifications.length);
}
function renderAppointments() {
  const t = el("appointmentTable");
  if (!t) return;
  t.innerHTML = appointments
    .map(
      (a) =>
        `<tr><td>${a.patientName || ""}</td><td>${a.appointmentDate || ""}</td><td>${a.status || "Scheduled"}</td></tr>`,
    )
    .join("");
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
      return `<tr class="patient-row"><td><strong>${p.name || ""}</strong><br><span class="sub-text">${p.email || "No email"}</span></td><td>${p.phone || "N/A"}</td><td>${p.condition || "General"}</td><td><span class="badge ${st.class}">${st.label}</span><br><span class="sub-text">${p.diagnosis || "Pending assessment"}</span></td><td><button class="btn btn-secondary small-btn" onclick="selectPatient('${p.id}')">Edit</button><button class="btn btn-danger small-btn" onclick="deletePatient('${p.id}')">Delete</button></td></tr>`;
    })
    .join("");
}
function selectPatient(id) {
  selectedPatientId = id;
  renderRecordDetails();
}
function renderRecordDetails() {
  const p = patients.find((x) => x.id === selectedPatientId) || patients[0];
  if (!p) return;
  selectedPatientId = p.id;
  if (el("recordDetails"))
    el("recordDetails").innerHTML =
      `<strong>${p.name || ""}</strong><br><span class="sub-text">ID: ${p.id || ""}</span><br><span class="sub-text">Email: ${p.email || "No email"}</span><br><span class="sub-text">Phone: ${p.phone || "N/A"}</span><br><span class="sub-text">Condition: ${p.condition || "General"}</span><br><span class="sub-text">Diagnosis: ${p.diagnosis || "Pending assessment"}</span>`;
  if (el("editPatientName")) el("editPatientName").value = p.name || "";
  if (el("editPatientEmail")) el("editPatientEmail").value = p.email || "";
  if (el("editPatientPhone")) el("editPatientPhone").value = p.phone || "";
  if (el("editPatientCondition"))
    el("editPatientCondition").value = p.condition || "";
  if (el("editPatientDiagnosis"))
    el("editPatientDiagnosis").value = p.diagnosis || "";
}
async function savePatientRecord() {
  const p = patients.find((x) => x.id === selectedPatientId);
  if (!p) return;
  await apiFetch(`/patients/${p.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...p,
      name: el("editPatientName")?.value.trim() || p.name,
      email: el("editPatientEmail")?.value.trim() || null,
      phone: el("editPatientPhone")?.value.trim() || p.phone,
      condition: el("editPatientCondition")?.value.trim() || p.condition,
      diagnosis: el("editPatientDiagnosis")?.value.trim() || p.diagnosis,
    }),
  });
  await loadAll();
}
async function submitNewPatient() {
  const n = {
    name: el("addName")?.value.trim(),
    email: el("addEmail")?.value.trim() || null,
    phone: el("addPhone")?.value.trim() || "N/A",
    condition: el("addCondition")?.value.trim() || "General",
    diagnosis: el("addDiagnosis")?.value.trim() || "Pending assessment",
  };
  if (!n.name) return;
  await apiFetch("/patients", { method: "POST", body: JSON.stringify(n) });
  await loadAll();
  showSection("patients");
}
async function deletePatient(id) {
  if (!confirm("Delete this patient?")) return;

  try {
    await apiFetch(`/patients/${id}`, {
      method: "DELETE"
    });

    if (selectedPatientId === id) {
      selectedPatientId = null;
    }

    await loadAll();
    alert("Patient deleted successfully.");
  } catch (error) {
    console.error("Delete patient error:", error);
    alert(error.message || "Failed to delete patient.");
  }
}
function renderBilling() {
  if (el("billingPatient"))
    el("billingPatient").innerHTML = patients
      .map((p) => `<option value="${p.id}">${p.id}</option>`)
      .join("");
  if (el("billingTable"))
    el("billingTable").innerHTML = bills
      .map(
        (b) => `<tr><td>${b.invoice || ""}</td><td>${b.amount || ""}</td></tr>`,
      )
      .join("");
}
async function addBill() {
  const patientId = el("billingPatient")?.value;
  const patient = patients.find((p) => p.id === patientId);
  const invoice = el("billingInvoice")?.value.trim();
  const amount = el("billingAmount")?.value;
  if (!patient || !invoice || !amount) return;
  await apiFetch("/billing/invoices", {
    method: "POST",
    body: JSON.stringify({
      patientId,
      patientName: patient.name,
      invoice,
      amount,
    }),
  });
  if (el("billingInvoice")) el("billingInvoice").value = "";
  if (el("billingAmount")) el("billingAmount").value = "";
  await loadAll();
}
function renderNotifications() {
  if (el("notificationPatient"))
    el("notificationPatient").innerHTML = patients
      .map((p) => `<option value="${p.id}">${p.id}</option>`)
      .join("");
  if (el("notificationTable"))
    el("notificationTable").innerHTML = notifications
      .map(
        (n) =>
          `<tr><td>${n.patientName || ""}</td><td>${n.type || ""}</td><td>${n.message || ""}</td><td>${n.status || ""}</td></tr>`,
      )
      .join("");
}
async function sendEmailNotification() {
  const patientId = el("notificationPatient")?.value;
  const subject =
    el("notificationSubject")?.value.trim() || "Healthcare Notification";
  const message = el("notificationMessage")?.value.trim();
  if (!patientId || !message) return;
  await apiFetch("/email/send", {
    method: "POST",
    body: JSON.stringify({ patientId, subject, message }),
  });
  if (el("notificationSubject")) el("notificationSubject").value = "";
  if (el("notificationMessage")) el("notificationMessage").value = "";
  await loadAll();
}
async function addAppointment() {
  const patientName = el("appointmentPatient")?.value.trim();
  const appointmentDate = el("appointmentDate")?.value;
  if (!patientName || !appointmentDate) return;
  await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify({ patientName, appointmentDate, status: "Scheduled" }),
  });
  if (el("appointmentPatient")) el("appointmentPatient").value = "";
  if (el("appointmentDate")) el("appointmentDate").value = "";
  await loadAll();
}
loadAll().catch((e) => {
  console.error(e);
  alert("Failed to load admin data. Check backend connection.");
});
