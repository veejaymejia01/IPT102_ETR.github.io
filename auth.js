const API = "https://etr-backend.onrender.com";
async function apiFetchPublic(url, options = {}) {
  const r = await fetch(API + url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let d = null;
  try {
    d = await r.json();
  } catch {}
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d;
}
async function login() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();
  const box = document.getElementById("loginError");
  if (box) box.innerText = "";
  if (!email || !password) {
    if (box) box.innerText = "Enter email and password.";
    return;
  }
  try {
    const data = await apiFetchPublic("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const user = {
      id: data.user?.id,
      email: data.user?.email || email,
      role: data.user?.role || "",
      name: data.user?.name || "User",
    };
    localStorage.setItem("healthcare_token", data.token);
    localStorage.setItem("healthcare_user", JSON.stringify(user));
    if (user.role === "admin") window.location.href = "admin-dashboard.html";
    else if (user.role === "doctor")
      window.location.href = "doctor-dashboard.html";
    else if (user.role === "patient")
      window.location.href = "patient-dashboard.html";
    else if (box) box.innerText = "Unsupported role.";
  } catch (e) {
    if (box) box.innerText = e.message || "Login failed.";
  }
}
async function registerPatient() {
  const name = document.getElementById("registerName")?.value.trim();
  const email = document.getElementById("registerEmail")?.value.trim();
  const password = document.getElementById("registerPassword")?.value.trim();
  const phone = document.getElementById("registerPhone")?.value.trim();
  const box = document.getElementById("registerError");
  if (box) box.innerText = "";
  if (!name || !email || !password) {
    if (box) box.innerText = "Name, email, and password are required.";
    return;
  }
  try {
    await apiFetchPublic("/auth/register-patient", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    });
    window.location.href = "index.html";
  } catch (e) {
    if (box) box.innerText = e.message || "Registration failed.";
  }
}
