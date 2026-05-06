const API = "https://etr-backend.onrender.com/api";

// ==================== UTILITIES ====================
function el(id) {
  return document.getElementById(id);
}

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      padding: 14px 20px; border-radius: 12px; color: white; font-weight: 600;
      z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === "success" ? "#15803d" : "#dc2626";
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 3000);
}

// ==================== REMEMBER ME ====================
function loadRememberedEmail() {
  const savedEmail = localStorage.getItem("remembered_email");
  const emailInput = el("loginEmail");
  const rememberCheckbox = el("rememberMe");

  if (emailInput && savedEmail) emailInput.value = savedEmail;
  if (rememberCheckbox) rememberCheckbox.checked = !!savedEmail;
}

// ==================== LOGIN ====================
async function login() {
  const email = el("loginEmail")?.value.trim();
  const password = el("loginPassword")?.value.trim();
  const remember = el("rememberMe")?.checked || false;

  if (!email || !password) {
    showToast("Email and password are required", "error");
    return;
  }

  try {
    const response = await fetch(API + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!data.token) throw new Error(data.error || "Login failed");

    if (remember) {
      localStorage.setItem("remembered_email", email);
    } else {
      localStorage.removeItem("remembered_email");
    }

    localStorage.setItem("healthcare_token", data.token);
    localStorage.setItem("healthcare_user", JSON.stringify(data.user));

    showToast("Login successful!", "success");

    setTimeout(() => {
      const role = data.user?.role;
      if (role === "admin") location.href = "admin-dashboard.html";
      else if (role === "doctor") location.href = "doctor-dashboard.html";
      else if (role === "patient") location.href = "patient-dashboard.html";
      else location.href = "index.html";
    }, 800);

  } catch (e) {
    showToast(e.message || "Login failed", "error");
  }
}

// ==================== SHOW / HIDE PASSWORD - FIXED ====================
function togglePassword() {
  const passwordField = el("loginPassword");
  const icon = el("togglePassword");

  if (!passwordField || !icon) return;

  if (passwordField.type === "password") {
    passwordField.type = "text";
    icon.textContent = "🙈";
  } else {
    passwordField.type = "password";
    icon.textContent = "👁";
  }
}

// ==================== REGISTER & FORGOT ====================
async function registerPatient() {
  const name = el("registerName")?.value.trim();
  const email = el("registerEmail")?.value.trim();
  const password = el("registerPassword")?.value.trim();
  const phone = el("registerPhone")?.value.trim();

  if (!name || !email || !password) {
    showToast("Name, email, and password are required", "error");
    return;
  }

  try {
    await fetch(API + "/auth/register-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone })
    });
    showToast("Registration successful! You can now login.", "success");
    setTimeout(showLogin, 1200);
  } catch (e) {
    showToast("Registration failed", "error");
  }
}

async function forgotPassword() {
  const email = el("forgotEmail")?.value.trim();
  if (!email) return showToast("Enter your email", "error");

  try {
    await fetch(API + "/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    showToast("Reset instructions sent to your email", "success");
    setTimeout(showLogin, 1500);
  } catch (e) {
    showToast("Failed to send reset email", "error");
  }
}

// ==================== UI HELPERS ====================
function hideAllAuthSections() {
  el("loginSection")?.classList.add("hidden");
  el("registerSection")?.classList.add("hidden");
  el("forgotSection")?.classList.add("hidden");
}

function showLogin() {
  hideAllAuthSections();
  el("loginSection")?.classList.remove("hidden");
}

function showRegister() {
  hideAllAuthSections();
  el("registerSection")?.classList.remove("hidden");
}

function showForgot() {
  hideAllAuthSections();
  el("forgotSection")?.classList.remove("hidden");
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  loadRememberedEmail();

  // Password Toggle
  const toggleBtn = el("togglePassword");
  if (toggleBtn) toggleBtn.addEventListener("click", togglePassword);

  // Enter key login
  const passwordField = el("loginPassword");
  if (passwordField) {
    passwordField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") login();
    });
  }
});
