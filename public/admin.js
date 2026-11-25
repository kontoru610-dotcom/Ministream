const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const settingsForm = document.getElementById("settingsForm");
const loginMessage = document.getElementById("loginMessage");
const saveMessage = document.getElementById("saveMessage");
let adminPassword = "";

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${adminPassword}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminPassword = document.getElementById("password").value;
  loginMessage.textContent = "Memeriksa password...";
  try {
    const data = await api("/api/admin/settings");
    for (const [key, value] of Object.entries(data.settings)) {
      const field = settingsForm.elements.namedItem(key);
      if (field) field.value = value;
    }
    showDashboard();
    loginMessage.textContent = "";
    await loadStats();
  } catch (error) {
    adminPassword = "";
    loginMessage.textContent = error.message;
  }
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveMessage.textContent = "Menyimpan...";
  const settings = {};
  for (const key of ["title","description","video_type","video_url","referral_1","referral_2","referral_3"]) {
    settings[key] = settingsForm.elements.namedItem(key).value.trim();
  }
  try {
    const data = await api("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({ settings })
    });
    saveMessage.textContent = "Perubahan berhasil disimpan.";
    document.title = `Dashboard - ${data.settings.title}`;
  } catch (error) {
    saveMessage.textContent = error.message;
  }
});

async function loadStats() {
  try {
    const data = await api("/api/admin/stats");
    data.clicks.forEach((count, index) => {
      document.getElementById(`stat${index + 1}`).textContent = count;
    });
  } catch (error) {
    saveMessage.textContent = error.message;
  }
}
document.getElementById("refreshStats").addEventListener("click", loadStats);
document.getElementById("logout").addEventListener("click", () => {
  adminPassword = "";
  settingsForm.reset();
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  document.getElementById("password").value = "";
});

const uploadButton = document.getElementById("uploadVideo");

uploadButton.addEventListener("click", async () => {
  const fileInput = document.getElementById("videoFile");
  const message = document.getElementById("uploadMessage");
  const file = fileInput.files[0];

  if (!file) {
    message.textContent = "Pilih video MP4 terlebih dahulu.";
    return;
  }

  if (!file.name.toLowerCase().endsWith(".mp4")) {
    message.textContent = "File harus berformat MP4.";
    return;
  }

  if (file.size > 95 * 1024 * 1024) {
    message.textContent = "Ukuran video maksimal 95 MB.";
    return;
  }

  const formData = new FormData();
  formData.append("video", file);

  uploadButton.disabled = true;
  message.textContent = "Sedang mengupload video...";

  try {
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminPassword}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload gagal.");
    }

    settingsForm.elements.namedItem("video_type").value = "mp4";
    settingsForm.elements.namedItem("video_url").value = data.video_url;

    message.textContent = "Upload berhasil! Tekan Simpan perubahan.";
    fileInput.value = "";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    uploadButton.disabled = false;
  }
});
