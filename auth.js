<!-- IPT102_ETR.github.io-main/auth.js -->
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

function setButtonLoading(id, loading, defaultText) {
  const btn = el(id);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
  } else {
    btn.disabled = false;
    btn.textContent = defaultText;
  }
}

// ==================== REMEMBER ME (FIXED) ====================
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
  const errorBox = el("loginError");

  if (errorBox) errorBox.textContent = "";

  if (!email || !password) {
    if (errorBox) errorBox.textContent = "Enter email and password.";
    return;
  }

  setButtonLoading("loginBtn", true, "Sign In");

  try {
    const response = await fetch(API + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!data.token) throw new Error(data.error || "Login failed");

    // Remember Me - Fixed
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
    showToast(e.message || "Login failed.", "error");
    if (errorBox) errorBox.textContent = e.message || "Login failed.";
  } finally {
    setButtonLoading("loginBtn", false, "Sign In");
  }
}

// ==================== REGISTER ====================
async function registerPatient() {
  const name = el("registerName")?.value.trim();
  const email = el("registerEmail")?.value.trim();
  const password = el("registerPassword")?.value.trim();
  const phone = el("registerPhone")?.value.trim();

  if (!name || !email || !password) {
    showToast("Name, email, and password are required.", "error");
    return;
  }

  setButtonLoading("registerBtn", true, "Register");

  try {
    await fetch(API + "/auth/register-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    }).then(r => r.json());

    showToast("Registration successful! You can now login.", "success");
    setTimeout(() => {
      showLogin();
      const loginEmail = el("loginEmail");
      if (loginEmail) loginEmail.value = email;
    }, 800);
  } catch (e) {
    showToast(e.message || "Registration failed.", "error");
  } finally {
    setButtonLoading("registerBtn", false, "Register");
  }
}

// ==================== FORGOT PASSWORD ====================
async function forgotPassword() {
  const email = el("forgotEmail")?.value.trim();
  if (!email) {
    showToast("Please enter your email.", "error");
    return;
  }

  setButtonLoading("forgotBtn", true, "Send Reset Email");

  try {
    await fetch(API + "/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(r => r.json());

    showToast("Password reset instructions sent to your email.", "success");
    setTimeout(showLogin, 1000);
  } catch (e) {
    showToast(e.message || "Failed to send reset email.", "error");
  } finally {
    setButtonLoading("forgotBtn", false, "Send Reset Email");
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
  const loginEmail = el("loginEmail")?.value.trim();
  if (loginEmail) el("forgotEmail").value = loginEmail;
}

function togglePassword(inputId, iconId) {
  const input = el(inputId);
  const icon = el(iconId);
  if (!input || !icon) return;
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  loadRememberedEmail();

  const passwordField = el("loginPassword");
  if (passwordField) {
    passwordField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") login();
    });
  }
});
