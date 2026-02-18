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

  if (!tabStaff || !tabStore || !panelStaff || !panelStore) return;

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

  if (!tbody || !empty || !list) return;

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
  console.log("✓ openAddModal called");
  editingID = null;
  const modal = document.getElementById("staff_modal");
  if (!modal) {
    console.error("❌ Modal element not found!");
    return;
  }
  
  const title = document.getElementById("modal_title");
  const name = document.getElementById("modal_name");
  const email = document.getElementById("modal_email");
  const position = document.getElementById("modal_position");
  const status = document.getElementById("modal_status");
  const err = document.getElementById("modal_err");
  const submit = document.getElementById("modal_submit");

  if (title) title.textContent = "Добавить сотрудника";
  if (name) name.value = "";
  if (email) email.value = "";
  if (position) position.value = "";
  if (status) status.value = "active";
  if (err) err.textContent = "";
  if (submit) submit.textContent = "Добавить";
  
  modal.style.display = "flex";
  console.log("✓ Modal opened, display:", modal.style.display);
}

function openEditModal(id) {
  const staff = staffList.find(s => s.id === id);
  if (!staff) return;

  editingID = id;
  const modal = document.getElementById("staff_modal");
  if (!modal) return;

  const title = document.getElementById("modal_title");
  const name = document.getElementById("modal_name");
  const email = document.getElementById("modal_email");
  const position = document.getElementById("modal_position");
  const status = document.getElementById("modal_status");
  const err = document.getElementById("modal_err");
  const submit = document.getElementById("modal_submit");

  if (title) title.textContent = "Изменить сотрудника";
  if (name) name.value = staff.name;
  if (email) email.value = staff.email;
  if (position) position.value = staff.position;
  if (status) status.value = staff.status;
  if (err) err.textContent = "";
  if (submit) submit.textContent = "Сохранить";
  
  modal.style.display = "flex";
}

function closeModal() {
  console.log("closeModal called");
  const modal = document.getElementById("staff_modal");
  if (modal) {
    modal.style.display = "none";
    console.log("Modal hidden");
  }
  editingID = null;
}

function validateStaffForm() {
  const name = document.getElementById("modal_name");
  const email = document.getElementById("modal_email");
  const position = document.getElementById("modal_position");
  const err = document.getElementById("modal_err");

  if (!err) return false;

  const nameVal = name ? name.value.trim() : "";
  const emailVal = email ? email.value.trim() : "";
  const posVal = position ? position.value : "";

  if (!nameVal) {
    err.textContent = "Укажи имя и фамилию.";
    return false;
  }

  if (!emailVal || !emailVal.includes("@")) {
    err.textContent = "Укажи корректный email.";
    return false;
  }

  if (!posVal) {
    err.textContent = "Выбери должность.";
    return false;
  }

  // Check email uniqueness (if adding new)
  if (!editingID && staffList.some(s => s.email === emailVal)) {
    err.textContent = "Этот email уже используется.";
    return false;
  }

  err.textContent = "";
  return true;
}

function addOrUpdateStaff() {
  if (!validateStaffForm()) return;

  const name = document.getElementById("modal_name");
  const email = document.getElementById("modal_email");
  const position = document.getElementById("modal_position");
  const status = document.getElementById("modal_status");

  const nameVal = name ? name.value.trim() : "";
  const emailVal = email ? email.value.trim() : "";
  const posVal = position ? position.value : "";
  const statVal = status ? status.value : "active";

  if (editingID) {
    // Update
    const idx = staffList.findIndex(s => s.id === editingID);
    if (idx !== -1) {
      staffList[idx] = { ...staffList[idx], name: nameVal, email: emailVal, position: posVal, status: statVal };
    }
  } else {
    // Add new
    staffList.push({
      id: generateID(),
      name: nameVal,
      email: emailVal,
      position: posVal,
      status: statVal,
      createdAt: new Date().toISOString(),
    });
  }

  saveToStorage(STORAGE_KEY_STAFF, staffList);
  renderStaffList();
  closeModal();

  // Show success message
  const errEl = document.getElementById("staff_err");
  if (errEl) {
    errEl.textContent = editingID ? "Сотрудник обновлён ✓" : "Сотрудник добавлен ✓";
    errEl.style.color = "var(--primary)";
    setTimeout(() => {
      errEl.textContent = "";
      errEl.style.color = "";
    }, 3000);
  }
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

  const nameEl = document.getElementById("store_name");
  const emailEl = document.getElementById("store_email");
  const phoneEl = document.getElementById("store_phone");
  const cityEl = document.getElementById("store_city");

  if (nameEl) nameEl.value = store.name || "";
  if (emailEl) emailEl.value = store.email || "";
  if (phoneEl) phoneEl.value = store.phone || "";
  if (cityEl) cityEl.value = store.city || "";
}

function saveStoreSettings() {
  const nameEl = document.getElementById("store_name");
  const emailEl = document.getElementById("store_email");
  const phoneEl = document.getElementById("store_phone");
  const cityEl = document.getElementById("store_city");

  const store = {
    name: nameEl ? nameEl.value.trim() : "",
    email: emailEl ? emailEl.value.trim() : "",
    phone: phoneEl ? phoneEl.value.trim() : "",
    city: cityEl ? cityEl.value.trim() : "",
  };

  if (!store.name) {
    const msgEl = document.getElementById("store_msg");
    if (msgEl) msgEl.textContent = "Укажи название магазина.";
    return;
  }

  saveToStorage(STORAGE_KEY_STORE, store);

  const msgEl = document.getElementById("store_msg");
  if (msgEl) {
    msgEl.textContent = "Изменения сохранены ✓";
    msgEl.style.color = "var(--primary)";
    setTimeout(() => {
      msgEl.textContent = "";
      msgEl.style.color = "";
    }, 3000);
  }
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
  console.log("🚀 Settings page initialized");
  
  // Load data
  staffList = loadFromStorage(STORAGE_KEY_STAFF, []);
  console.log("Loaded staff list:", staffList);

  // Tabs
  initTabs();

  // Staff Management
  const staffAddBtn = document.getElementById("staff_add_btn");
  const modalClose = document.getElementById("modal_close");
  const modalCancel = document.getElementById("modal_cancel");
  const modalSubmit = document.getElementById("modal_submit");
  const staffModal = document.getElementById("staff_modal");
  const storeSave = document.getElementById("store_save");

  if (staffAddBtn) {
    staffAddBtn.addEventListener("click", function(e) {
      console.log("📌 Button click detected");
      openAddModal();
    });
    console.log("✓ Attached click handler to staff_add_btn");
  } else {
    console.error("❌ staff_add_btn element not found in DOM");
  }
  
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalCancel) modalCancel.addEventListener("click", closeModal);
  if (modalSubmit) modalSubmit.addEventListener("click", addOrUpdateStaff);

  if (staffModal) {
    staffModal.addEventListener("click", (e) => {
      if (e.target.id === "staff_modal") closeModal();
    });
  }

  // Store Settings
  if (storeSave) storeSave.addEventListener("click", saveStoreSettings);

  // Load store settings
  loadStoreSettings();

  // Render initial list
  renderStaffList();
}

// Boot
console.log("📄 settings.js loaded, document.readyState:", document.readyState);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    console.log("🔄 DOMContentLoaded event fired");
    init();
  });
} else {
  console.log("✓ Document already ready, calling init directly");
  init();
}
