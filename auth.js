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

function setButtonLoading(buttonId, isLoading, defaultText) {
  const button = document.getElementById(buttonId);

  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span>Please wait...`;
  } else {
    button.disabled = false;
    button.innerHTML = defaultText;
  }
}

async function apiFetchPublic(url, options = {}) {
  const r = await fetch(API + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let d = null;

  try {
    d = await r.json();
  } catch {}

  if (!r.ok) {
    throw new Error(d?.error || "Request failed");
  }

  return d;
}

function togglePassword(inputId = "loginPassword", toggleId = "togglePasswordText") {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);

  if (!input || !toggle) return;

  if (input.type === "password") {
    input.type = "text";
    toggle.textContent = "Hide";
  } else {
    input.type = "password";
    toggle.textContent = "Show";
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
    }, 600);
  } catch (e) {
    showToast(e.message || "Login failed.", "error");
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
      document.getElementById("loginEmail").value = email;
    }, 700);
  } catch (e) {
    showToast(e.message || "Registration failed.", "error");
  } finally {
    setButtonLoading("registerBtn", false, "Register");
  }
}
