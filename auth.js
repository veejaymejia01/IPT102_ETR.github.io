const API = "https://etr-backend.onrender.com/api";

/* =========================
   INIT (REMEMBER ME)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("remembered_email");

  if (savedEmail) {
    const emailInput = document.getElementById("loginEmail");
    const rememberMe = document.getElementById("rememberMe");

    if (emailInput) emailInput.value = savedEmail;
    if (rememberMe) rememberMe.checked = true;
  }
});

/* =========================
   API HELPER
========================= */
async function apiFetchPublic(url, options = {}) {
  const response = await fetch(API + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

/* =========================
   TOAST
========================= */
function showToast(message, type = "error") {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

/* =========================
   LOADING BUTTON
========================= */
function setButtonLoading(buttonId, isLoading, defaultText) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> Please wait...`;
  } else {
    button.disabled = false;
    button.innerHTML = defaultText;
  }
}

/* =========================
   TOGGLE PASSWORD (FIXED)
========================= */
function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (!input || !icon) return;

  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}

/* =========================
   SECTION SWITCHING
========================= */
function hideAll() {
  document.getElementById("loginSection")?.classList.add("hidden");
  document.getElementById("registerSection")?.classList.add("hidden");
  document.getElementById("forgotSection")?.classList.add("hidden");
}

function showLogin() {
  hideAll();
  document.getElementById("loginSection")?.classList.remove("hidden");
}

function showRegister() {
  hideAll();
  document.getElementById("registerSection")?.classList.remove("hidden");
}

function showForgot() {
  hideAll();
  document.getElementById("forgotSection")?.classList.remove("hidden");

  const loginEmail = document.getElementById("loginEmail")?.value.trim();
  if (loginEmail && document.getElementById("forgotEmail")) {
    document.getElementById("forgotEmail").value = loginEmail;
  }
}

/* =========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();
  const rememberMe = document.getElementById("rememberMe")?.checked;

  if (!email || !password) {
    showToast("Enter email and password.", "error");
    return;
  }

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

    // ✅ FIXED REMEMBER ME
    if (rememberMe) {
      localStorage.setItem("remembered_email", email);
    } else {
      localStorage.removeItem("remembered_email");
    }

    showToast("Login successful", "success");

    setTimeout(() => {
      if (user.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else if (user.role === "doctor") {
        window.location.href = "doctor-dashboard.html";
      } else if (user.role === "patient") {
        window.location.href = "patient-dashboard.html";
      } else {
        showToast("Unsupported role", "error");
        setButtonLoading("loginBtn", false, "Sign In");
      }
    }, 600);

  } catch (error) {
    showToast(error.message || "Login failed", "error");
    setButtonLoading("loginBtn", false, "Sign In");
  }
}

/* =========================
   REGISTER
========================= */
async function registerPatient() {
  const name = document.getElementById("registerName")?.value.trim();
  const email = document.getElementById("registerEmail")?.value.trim();
  const password = document.getElementById("registerPassword")?.value.trim();
  const phone = document.getElementById("registerPhone")?.value.trim();

  if (!name || !email || !password) {
    showToast("Name, email, and password are required.", "error");
    return;
  }

  setButtonLoading("registerBtn", true, "Register");

  try {
    await apiFetchPublic("/auth/register-patient", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    });

    showToast("Registration successful", "success");

    setTimeout(() => {
      showLogin();
      document.getElementById("loginEmail").value = email;
    }, 600);

  } catch (error) {
    showToast(error.message || "Registration failed", "error");
  } finally {
    setButtonLoading("registerBtn", false, "Register");
  }
}

/* =========================
   FORGOT PASSWORD
========================= */
async function forgotPassword() {
  const email = document.getElementById("forgotEmail")?.value.trim();

  if (!email) {
    showToast("Enter your email.", "error");
    return;
  }

  setButtonLoading("forgotBtn", true, "Send Reset Email");

  try {
    await apiFetchPublic("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    showToast("Reset email sent", "success");

    setTimeout(() => {
      showLogin();
    }, 800);

  } catch (error) {
    showToast(error.message || "Failed to send email", "error");
  } finally {
    setButtonLoading("forgotBtn", false, "Send Reset Email");
  }
}
