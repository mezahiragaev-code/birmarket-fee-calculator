// ===== Storage Keys =====
const STORAGE_KEY_STAFF = "birmarket_staff_list";
const STORAGE_KEY_STORE = "birmarket_store_settings";

// ===== Helpers =====
function loadFromStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error("Storage read error:", e);
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Storage write error:", e);
    return false;
  }
}

function formatStatus(status) {
  return status === "active" ? "✓ Активный" : "○ Неактивный";
}

function generateID() {
  return "staff_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// ===== Tabs =====
function initTabs() {
  const tabStaff = document.getElementById("tab-staff");
  const tabStore = document.getElementById("tab-store");
  const panelStaff = document.getElementById("panel-staff");
  const panelStore = document.getElementById("panel-store");

  function setActive(which) {
    const staffOn = which === "staff";
    tabStaff.classList.toggle("tab--active", staffOn);
    tabStore.classList.toggle("tab--active", !staffOn);
    panelStaff.style.display = staffOn ? "" : "none";
    panelStore.style.display = staffOn ? "none" : "";
  }

  tabStaff.addEventListener("click", () => setActive("staff"));
  tabStore.addEventListener("click", () => setActive("store"));
}

// ===== Staff Management =====
let staffList = [];
let editingID = null;

function renderStaffList() {
  const tbody = document.getElementById("staff_tbody");
  const empty = document.getElementById("staff_empty");
  const list = document.getElementById("staff_list");

  tbody.innerHTML = "";

  if (staffList.length === 0) {
    empty.style.display = "block";
    list.style.overflow = "visible";
    return;
  }

  empty.style.display = "none";
  list.style.overflow = "auto";

  staffList.forEach(staff => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:12px; border-bottom:1px solid var(--border); font-size:13px;">${escapeHtml(staff.name)}</td>
      <td style="padding:12px; border-bottom:1px solid var(--border); font-size:13px;">${escapeHtml(staff.email)}</td>
      <td style="padding:12px; border-bottom:1px solid var(--border); font-size:13px;">${escapeHtml(staff.position)}</td>
      <td style="padding:12px; border-bottom:1px solid var(--border); font-size:13px; color:${staff.status === "active" ? "var(--primary)" : "var(--muted)"};">
        ${formatStatus(staff.status)}
      </td>
      <td style="padding:12px; border-bottom:1px solid var(--border); text-align:center;">
        <button class="staff-edit-btn" data-id="${staff.id}" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:13px; margin-right:8px;">✏️ Изменить</button>
        <button class="staff-delete-btn" data-id="${staff.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:13px;">🗑️ Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach listeners
  document.querySelectorAll(".staff-edit-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.dataset.id;
      openEditModal(id);
    });
  });

  document.querySelectorAll(".staff-delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.dataset.id;
      if (confirm("Удалить этого сотрудника?")) {
        deleteStaff(id);
      }
    });
  });
}

function openAddModal() {
  editingID = null;
  document.getElementById("modal_title").textContent = "Добавить сотрудника";
  document.getElementById("modal_name").value = "";
  document.getElementById("modal_email").value = "";
  document.getElementById("modal_position").value = "";
  document.getElementById("modal_status").value = "active";
  document.getElementById("modal_err").textContent = "";
  document.getElementById("modal_submit").textContent = "Добавить";
  document.getElementById("staff_modal").style.display = "flex";
}

function openEditModal(id) {
  const staff = staffList.find(s => s.id === id);
  if (!staff) return;

  editingID = id;
  document.getElementById("modal_title").textContent = "Изменить сотрудника";
  document.getElementById("modal_name").value = staff.name;
  document.getElementById("modal_email").value = staff.email;
  document.getElementById("modal_position").value = staff.position;
  document.getElementById("modal_status").value = staff.status;
  document.getElementById("modal_err").textContent = "";
  document.getElementById("modal_submit").textContent = "Сохранить";
  document.getElementById("staff_modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("staff_modal").style.display = "none";
  editingID = null;
}

function validateStaffForm() {
  const name = document.getElementById("modal_name").value.trim();
  const email = document.getElementById("modal_email").value.trim();
  const position = document.getElementById("modal_position").value;

  const err = document.getElementById("modal_err");

  if (!name) {
    err.textContent = "Укажи имя и фамилию.";
    return false;
  }

  if (!email || !email.includes("@")) {
    err.textContent = "Укажи корректный email.";
    return false;
  }

  if (!position) {
    err.textContent = "Выбери должность.";
    return false;
  }

  // Check email uniqueness (if adding new)
  if (!editingID && staffList.some(s => s.email === email)) {
    err.textContent = "Этот email уже используется.";
    return false;
  }

  err.textContent = "";
  return true;
}

function addOrUpdateStaff() {
  if (!validateStaffForm()) return;

  const name = document.getElementById("modal_name").value.trim();
  const email = document.getElementById("modal_email").value.trim();
  const position = document.getElementById("modal_position").value;
  const status = document.getElementById("modal_status").value;

  if (editingID) {
    // Update
    const idx = staffList.findIndex(s => s.id === editingID);
    if (idx !== -1) {
      staffList[idx] = { ...staffList[idx], name, email, position, status };
    }
  } else {
    // Add new
    staffList.push({
      id: generateID(),
      name,
      email,
      position,
      status,
      createdAt: new Date().toISOString(),
    });
  }

  saveToStorage(STORAGE_KEY_STAFF, staffList);
  renderStaffList();
  closeModal();

  // Show success message
  const errEl = document.getElementById("staff_err");
  errEl.textContent = editingID ? "Сотрудник обновлён ✓" : "Сотрудник добавлен ✓";
  errEl.style.color = "var(--primary)";
  setTimeout(() => {
    errEl.textContent = "";
    errEl.style.color = "";
  }, 3000);
}

function deleteStaff(id) {
  staffList = staffList.filter(s => s.id !== id);
  saveToStorage(STORAGE_KEY_STAFF, staffList);
  renderStaffList();
}

// ===== Store Settings =====
function loadStoreSettings() {
  const store = loadFromStorage(STORAGE_KEY_STORE, {
    name: "Мой магазин",
    email: "",
    phone: "",
    city: "",
  });

  document.getElementById("store_name").value = store.name || "";
  document.getElementById("store_email").value = store.email || "";
  document.getElementById("store_phone").value = store.phone || "";
  document.getElementById("store_city").value = store.city || "";
}

function saveStoreSettings() {
  const store = {
    name: document.getElementById("store_name").value.trim(),
    email: document.getElementById("store_email").value.trim(),
    phone: document.getElementById("store_phone").value.trim(),
    city: document.getElementById("store_city").value.trim(),
  };

  if (!store.name) {
    document.getElementById("store_msg").textContent = "Укажи название магазина.";
    return;
  }

  saveToStorage(STORAGE_KEY_STORE, store);

  const msgEl = document.getElementById("store_msg");
  msgEl.textContent = "Изменения сохранены ✓";
  msgEl.style.color = "var(--primary)";
  setTimeout(() => {
    msgEl.textContent = "";
    msgEl.style.color = "";
  }, 3000);
}

// ===== XSS Protection =====
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ===== Init =====
function init() {
  // Load data
  staffList = loadFromStorage(STORAGE_KEY_STAFF, []);

  // Tabs
  initTabs();

  // Staff Management
  document.getElementById("staff_add_btn").addEventListener("click", openAddModal);
  document.getElementById("modal_close").addEventListener("click", closeModal);
  document.getElementById("modal_cancel").addEventListener("click", closeModal);
  document.getElementById("modal_submit").addEventListener("click", addOrUpdateStaff);

  // Close on overlay click
  document.getElementById("staff_modal").addEventListener("click", (e) => {
    if (e.target.id === "staff_modal") closeModal();
  });

  // Store Settings
  document.getElementById("store_save").addEventListener("click", saveStoreSettings);

  // Load store settings
  loadStoreSettings();

  // Render initial list
  renderStaffList();
}

// Boot
document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
