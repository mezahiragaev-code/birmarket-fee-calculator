const API_BASE = "https://bbu.umico.az/api/v1/admin/faq";
const TOKEN_KEY = "birmarket_faq_admin_token";

const $ = (id) => document.getElementById(id);

const els = {
  token: $("token"),
  saveToken: $("saveToken"),
  clearToken: $("clearToken"),
  tokenStatus: $("tokenStatus"),

  openCreate: $("openCreate"),
  refresh: $("refresh"),
  search: $("search"),

  list: $("list"),
  listError: $("listError"),
  count: $("count"),

  modal: $("modal"),
  modalClose: $("modalClose"),
  modalX: $("modalX"),
  modalTitle: $("modalTitle"),
  modalSub: $("modalSub"),
  m_question: $("m_question"),
  m_answer: $("m_answer"),
  m_save: $("m_save"),
  m_cancel: $("m_cancel"),
  m_err: $("m_err"),
};

let items = [];
let mode = "create"; // create | edit
let editingId = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function setListError(msg) {
  els.listError.textContent = msg || "";
}

function setModalError(msg) {
  els.m_err.textContent = msg || "";
}

function openModal({ title, sub, question = "", answer = "" }) {
  els.modalTitle.textContent = title;
  els.modalSub.textContent = sub;
  els.m_question.value = question;
  els.m_answer.value = answer;
  setModalError("");
  els.modal.hidden = false;
}

function closeModal() {
  els.modal.hidden = true;
  mode = "create";
  editingId = null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderList() {
  const q = (els.search.value || "").trim().toLowerCase();
  const filtered = q
    ? items.filter(x => (x.question || "").toLowerCase().includes(q))
    : items;

  els.count.textContent = `Всего: ${filtered.length}`;

  els.list.innerHTML = filtered.map(x => `
    <div class="faqItem">
      <div class="faqQ">${escapeHtml(x.question || "")}</div>
      <div class="faqMeta">ID: ${escapeHtml(x.id)}</div>
      <div class="faqActions">
        <button class="btn" data-action="edit" data-id="${escapeHtml(x.id)}">Редактировать</button>
        <button class="btn btnDanger" data-action="delete" data-id="${escapeHtml(x.id)}">Удалить</button>
      </div>
    </div>
  `).join("");

  // bind actions
  els.list.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "edit") onEdit(id);
      if (action === "delete") onDelete(id);
    });
  });
}

async function apiGetList() {
  setListError("");

  const token = getToken();
  if (!token) {
    setListError("Вставь Bearer токен, чтобы загрузить список.");
    items = [];
    renderList();
    return;
  }

  const res = await fetch(API_BASE, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка ${res.status}. ${text}`.slice(0, 300));
  }

  const json = await res.json();
  items = Array.isArray(json.data) ? json.data : [];
  renderList();
}

async function apiCreate(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка ${res.status}. ${text}`.slice(0, 300));
  }
  return res.json().catch(() => ({}));
}

async function apiUpdate(id, payload) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка ${res.status}. ${text}`.slice(0, 300));
  }
  return res.json().catch(() => ({}));
}

async function apiDelete(id) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка ${res.status}. ${text}`.slice(0, 300));
  }
  return res.json().catch(() => ({}));
}

function onEdit(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;

  mode = "edit";
  editingId = id;

  openModal({
    title: "Редактирование FAQ",
    sub: "Измени вопрос и ответ, затем нажми “Сохранить”",
    question: item.question || "",
    answer: item.answer || "",
  });
}

async function onDelete(id) {
  const item = items.find(x => x.id === id);
  const ok = confirm(`Удалить вопрос?\n\n${item?.question || id}`);
  if (!ok) return;

  try {
    await apiDelete(id);
    await apiGetList();
  } catch (e) {
    setListError(String(e.message || e));
  }
}

function onCreate() {
  mode = "create";
  editingId = null;
  openModal({
    title: "Добавить вопрос",
    sub: "Заполни вопрос и ответ, затем нажми “Сохранить”",
    question: "",
    answer: "",
  });
}

async function onModalSave() {
  setModalError("");

  const question = (els.m_question.value || "").trim();
  const answer = (els.m_answer.value || "").trim();

  if (!question) { setModalError("Вопрос не может быть пустым."); return; }
  if (!answer) { setModalError("Ответ не может быть пустым."); return; }

  const payload = { question, answer };

  try {
    if (mode === "create") {
      await apiCreate(payload);
    } else {
      await apiUpdate(editingId, payload);
    }
    closeModal();
    await apiGetList();
  } catch (e) {
    setModalError(String(e.message || e));
  }
}

function initTokenUI() {
  const t = getToken();
  els.token.value = t;
  els.tokenStatus.textContent = t ? "Токен сохранен" : "Токен не задан";
}

els.saveToken.addEventListener("click", () => {
  const t = (els.token.value || "").trim();
  setToken(t);
  initTokenUI();
  apiGetList().catch(e => setListError(String(e.message || e)));
});

els.clearToken.addEventListener("click", () => {
  clearToken();
  initTokenUI();
  items = [];
  renderList();
});

els.openCreate.addEventListener("click", onCreate);
els.refresh.addEventListener("click", () => apiGetList().catch(e => setListError(String(e.message || e))));
els.search.addEventListener("input", renderList);

els.modalClose.addEventListener("click", closeModal);
els.modalX.addEventListener("click", closeModal);
els.m_cancel.addEventListener("click", closeModal);
els.m_save.addEventListener("click", onModalSave);

// Boot
initTokenUI();
apiGetList().catch(e => setListError(String(e.message || e)));
