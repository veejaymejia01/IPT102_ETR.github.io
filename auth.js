const API = "https://etr-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("remembered_email");

  if (savedEmail) {
    const emailInput = document.getElementById("loginEmail");
    const rememberMe = document.getElementById("rememberMe");

    if (emailInput) emailInput.value = savedEmail;
    if (rememberMe) rememberMe.checked = true;
  }
});

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
  }, 3200);
}

function setButtonLoading(buttonId, isLoading, text) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span>Please wait...`;
  } else {
    button.disabled = false;
    button.innerHTML = text;
  }
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input || !button) return;

  if (input.type === "password") {
    input.type = "text";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.8 21.8 0 0 1 5.06-5.94"></path>
        <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a21.7 21.7 0 0 1-3.22 4.31"></path>
        <path d="M1 1l22 22"></path>
        <path d="M9.5 9.5a3.5 3.5 0 0 0 5 5"></path>
      </svg>
    `;
  } else {
    input.type = "password";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
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

  const loginEmail = document.getElementById("loginEmail")?.value.trim();
  if (loginEmail && document.getElementById("forgotEmail")) {
    document.getElementById("forgotEmail").value = loginEmail;
  }
}

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

    if (rememberMe) {
      localStorage.setItem("remembered_email", email);
    } else {
      localStorage.removeItem("remembered_email");
    }

    showToast("Login successful.", "success");

    setTimeout(() => {
      if (user.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else if (user.role === "doctor") {
        window.location.href = "doctor-dashboard.html";
      } else if (user.role === "patient") {
        window.location.href = "patient-dashboard.html";
      } else {
        showToast("Unsupported role.", "error");
        setButtonLoading("loginBtn", false, "Sign In");
      }
    }, 650);
  } catch (error) {
    showToast(error.message || "Login failed.", "error");
    setButtonLoading("loginBtn", false, "Sign In");
  }
}

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

    showToast("Registration successful. You can now log in.", "success");

    setTimeout(() => {
      showLogin();
      const loginEmail = document.getElementById("loginEmail");
      if (loginEmail) loginEmail.value = email;
    }, 700);
  } catch (error) {
    showToast(error.message || "Registration failed.", "error");
  } finally {
    setButtonLoading("registerBtn", false, "Register");
  }
}

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

    showToast("Password reset instruction sent.", "success");

    setTimeout(() => {
      showLogin();
    }, 900);
  } catch (error) {
    showToast(error.message || "Failed to send reset email.", "error");
  } finally {
    setButtonLoading("forgotBtn", false, "Send Reset Email");
  }
}
