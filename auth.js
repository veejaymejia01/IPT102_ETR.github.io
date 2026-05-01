const API = "https://etr-backend.onrender.com";
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("remembered_email");
  if (saved) {
    const e = document.getElementById("loginEmail"),
      r = document.getElementById("rememberMe");
    if (e) e.value = saved;
    if (r) r.checked = true;
  }
});
async function apiFetchPublic(url, options = {}) {
  const r = await fetch(API + url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
function showToast(message, type = "error") {
  const t = document.getElementById("toast");
  if (!t) return alert(message);
  t.textContent = message;
  t.className = `toast ${type} show`;
  setTimeout(() => (t.className = "toast"), 3000);
}
function setButtonLoading(id, on, text) {
  const b = document.getElementById(id);
  if (!b) return;
  if (on) {
    b.disabled = true;
    b.innerHTML = `<span class="spinner"></span>Please wait...`;
  } else {
    b.disabled = false;
    b.innerHTML = text;
  }
}
function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId),
    icon = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}
function hideAllAuthSections() {
  document.getElementById("loginSection")?.classList.add("hidden");
  document.getElementById("registerSection")?.classList.add("hidden");
  document.getElementById("forgotSection")?.classList.add("hidden");
}
function showLogin() {
  hideAllAuthSections();
  document.getElementById("loginSection")?.classList.remove("hidden");
}
function showRegister() {
  hideAllAuthSections();
  document.getElementById("registerSection")?.classList.remove("hidden");
}
function showForgot() {
  hideAllAuthSections();
  document.getElementById("forgotSection")?.classList.remove("hidden");
  const le = document.getElementById("loginEmail")?.value.trim(),
    fe = document.getElementById("forgotEmail");
  if (le && fe) fe.value = le;
}
async function login() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();
  const remember = document.getElementById("rememberMe")?.checked;
  if (!email || !password) return showToast("Enter email and password.");
  setButtonLoading("loginBtn", true, "Sign In");
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
    remember
      ? localStorage.setItem("remembered_email", email)
      : localStorage.removeItem("remembered_email");
    showToast("Login successful.", "success");
    setTimeout(() => {
      if (user.role === "admin") location.href = "admin-dashboard.html";
      else if (user.role === "doctor") location.href = "doctor-dashboard.html";
      else if (user.role === "patient")
        location.href = "patient-dashboard.html";
      else {
        showToast("Unsupported role.");
        setButtonLoading("loginBtn", false, "Sign In");
      }
    }, 650);
  } catch (e) {
    showToast(e.message || "Login failed.");
    setButtonLoading("loginBtn", false, "Sign In");
  }
}
async function registerPatient() {
  const name = document.getElementById("registerName")?.value.trim(),
    email = document.getElementById("registerEmail")?.value.trim(),
    password = document.getElementById("registerPassword")?.value.trim(),
    phone = document.getElementById("registerPhone")?.value.trim();
  if (!name || !email || !password)
    return showToast("Name, email, and password are required.");
  setButtonLoading("registerBtn", true, "Register");
  try {
    await apiFetchPublic("/auth/register-patient", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    });
    showToast("Registration successful. You can now log in.", "success");
    setTimeout(() => {
      showLogin();
      const le = document.getElementById("loginEmail");
      if (le) le.value = email;
    }, 700);
  } catch (e) {
    showToast(e.message || "Registration failed.");
  } finally {
    setButtonLoading("registerBtn", false, "Register");
  }
}
async function forgotPassword() {
  const email = document.getElementById("forgotEmail")?.value.trim();
  if (!email) return showToast("Enter your email.");
  setButtonLoading("forgotBtn", true, "Send Reset Email");
  try {
    await apiFetchPublic("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    showToast("Password reset instruction sent.", "success");
    setTimeout(() => showLogin(), 900);
  } catch (e) {
    showToast(e.message || "Failed to send reset email.");
  } finally {
    setButtonLoading("forgotBtn", false, "Send Reset Email");
  }
}
