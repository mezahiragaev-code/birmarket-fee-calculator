const TAKE_RATES_URL = "data/take_rates.csv";
const PAYMENT_METHODS_URL = "data/payment_methods.csv";

let takeRates = [];
let paymentMethods = [];

// ===== Helpers =====
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? "");
    return obj;
  });
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatPercent(n) { return `${Number(n).toFixed(2)}%`; }
function formatAZN(n) { return `${Number(n).toFixed(2)} AZN`; }

function fillSelect(selectEl, options, placeholder) {
  selectEl.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  selectEl.appendChild(ph);

  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  });
}

function getBaseFee(category, subcategory) {
  const row = takeRates.find(r => r.category === category && r.subcategory === subcategory);
  return row ? row.marketplace_fee_percent : null;
}

function getPaymentConfig(code) {
  return paymentMethods.find(p => p.code === code) || null;
}

function buildCategories() {
  return Array.from(new Set(takeRates.map(r => r.category))).sort((a,b) => a.localeCompare(b, "ru"));
}

function buildSubcategories(category) {
  return takeRates
    .filter(r => r.category === category)
    .map(r => r.subcategory)
    .sort((a,b) => a.localeCompare(b, "ru"));
}

// ===== Tabs =====
function initTabs() {
  const tabFee = document.getElementById("tab-fee");
  const tabBep = document.getElementById("tab-bep");
  const panelFee = document.getElementById("panel-fee");
  const panelBep = document.getElementById("panel-bep");

  function setActive(which) {
    const feeOn = which === "fee";
    tabFee.classList.toggle("tab--active", feeOn);
    tabBep.classList.toggle("tab--active", !feeOn);
    panelFee.style.display = feeOn ? "" : "none";
    panelBep.style.display = feeOn ? "none" : "";
  }

  tabFee.addEventListener("click", () => setActive("fee"));
  tabBep.addEventListener("click", () => setActive("bep"));
}

// ===== Fee Calculator (Tab 1) =====
function initFeeCalc() {
  const els = {
    category: document.getElementById("fee_category"),
    subcategory: document.getElementById("fee_subcategory"),
    price: document.getElementById("fee_price"),
    payment: document.getElementById("fee_payment"),
    calc: document.getElementById("fee_calc"),
    reset: document.getElementById("fee_reset"),
    err: document.getElementById("fee_err"),
    result: document.getElementById("fee_result"),
    r_base: document.getElementById("fee_r_base"),
    r_acq: document.getElementById("fee_r_acq"),
    r_inst: document.getElementById("fee_r_inst"),
    r_total: document.getElementById("fee_r_total"),
    r_fee_amt: document.getElementById("fee_r_fee_amt"),
    r_income: document.getElementById("fee_r_income"),
  };

  function setError(msg) { els.err.textContent = msg || ""; }

  function isValid() {
    const price = toNumber(els.price.value);
    return (
      els.subcategory.value !== "" &&
      els.payment.value !== "" &&
      price !== null &&
      price >= 0.01
    );
  }

  function updateBtn() { els.calc.disabled = !isValid(); }

  function onCategoryChange() {
    const cat = els.category.value;
    if (!cat) {
      els.subcategory.disabled = true;
      fillSelect(els.subcategory, [], "Выберите подкатегорию");
      updateBtn();
      return;
    }

    const subs = buildSubcategories(cat);
    fillSelect(els.subcategory, subs.map(s => ({ value: s, label: s })), "Выберите подкатегорию");
    els.subcategory.disabled = false;
    updateBtn();
  }

  function reset() {
    setError("");
    els.category.value = "";
    els.subcategory.disabled = true;
    fillSelect(els.subcategory, [], "Выберите подкатегорию");
    els.price.value = "";
    els.payment.value = "";
    els.result.hidden = true;
    updateBtn();
  }

  function calculate() {
    setError("");
    if (!isValid()) {
      setError("Заполни подкатегорию, цену и способ оплаты.");
      els.result.hidden = true;
      return;
    }

    const category = els.category.value;
    const subcategory = els.subcategory.value;
    const price = toNumber(els.price.value);
    const pay = getPaymentConfig(els.payment.value);

    const baseFee = getBaseFee(category, subcategory);
    if (baseFee === null) { setError("Не найдена базовая комиссия для подкатегории."); els.result.hidden = true; return; }
    if (!pay) { setError("Не найден способ оплаты."); els.result.hidden = true; return; }

    const acquiring = pay.acquiring_percent;
    const installment = pay.installment_percent;
    const totalPercent = baseFee + acquiring + installment;

    const feeAmt = Number((price * totalPercent / 100).toFixed(2));
    const income = Number((price - (price * totalPercent / 100)).toFixed(2));

    els.r_base.textContent = formatPercent(baseFee);
    els.r_acq.textContent = formatPercent(acquiring);
    els.r_inst.textContent = formatPercent(installment);
    els.r_total.textContent = formatPercent(totalPercent);
    els.r_fee_amt.textContent = formatAZN(feeAmt);
    els.r_income.textContent = formatAZN(income);

    els.result.hidden = false;
  }

  // init selects (data already loaded)
  const cats = buildCategories();
  fillSelect(els.category, cats.map(c => ({ value: c, label: c })), "Выберите категорию");
  fillSelect(els.payment, paymentMethods.map(p => ({ value: p.code, label: p.name })), "Выберите способ оплаты");

  els.category.addEventListener("change", onCategoryChange);
  els.subcategory.addEventListener("change", updateBtn);
  els.payment.addEventListener("change", updateBtn);
  els.price.addEventListener("input", updateBtn);
  els.calc.addEventListener("click", calculate);
  els.reset.addEventListener("click", reset);

  updateBtn();
}

// ===== Break-even Price (Tab 2) =====
function initBepCalc() {
  const els = {
    category: document.getElementById("bep_category"),
    subcategory: document.getElementById("bep_subcategory"),
    payment: document.getElementById("bep_payment"),
    cogs: document.getElementById("bep_cogs"),
    calc: document.getElementById("bep_calc"),
    reset: document.getElementById("bep_reset"),
    err: document.getElementById("bep_err"),
    result: document.getElementById("bep_result"),
    r_base: document.getElementById("bep_r_base"),
    r_acq: document.getElementById("bep_r_acq"),
    r_inst: document.getElementById("bep_r_inst"),
    r_total: document.getElementById("bep_r_total"),
    r_price: document.getElementById("bep_r_price"),
    r_profit: document.getElementById("bep_r_profit"),
  };

  function setError(msg) { els.err.textContent = msg || ""; }

  function isValid() {
    const cogs = toNumber(els.cogs.value);
    return (
      els.subcategory.value !== "" &&
      els.payment.value !== "" &&
      cogs !== null &&
      cogs >= 0.01
    );
  }

  function updateBtn() { els.calc.disabled = !isValid(); }

  function onCategoryChange() {
    const cat = els.category.value;
    if (!cat) {
      els.subcategory.disabled = true;
      fillSelect(els.subcategory, [], "Выберите подкатегорию");
      updateBtn();
      return;
    }

    const subs = buildSubcategories(cat);
    fillSelect(els.subcategory, subs.map(s => ({ value: s, label: s })), "Выберите подкатегорию");
    els.subcategory.disabled = false;
    updateBtn();
  }

  function reset() {
    setError("");
    els.category.value = "";
    els.subcategory.disabled = true;
    fillSelect(els.subcategory, [], "Выберите подкатегорию");
    els.payment.value = "";
    els.cogs.value = "";
    els.result.hidden = true;
    updateBtn();
  }

  function calculate() {
    setError("");
    if (!isValid()) {
      setError("Заполни подкатегорию, способ оплаты и себестоимость.");
      els.result.hidden = true;
      return;
    }

    const category = els.category.value;
    const subcategory = els.subcategory.value;
    const cogs = toNumber(els.cogs.value);
    const pay = getPaymentConfig(els.payment.value);

    const baseFee = getBaseFee(category, subcategory);
    if (baseFee === null) { setError("Не найдена базовая комиссия для подкатегории."); els.result.hidden = true; return; }
    if (!pay) { setError("Не найден способ оплаты."); els.result.hidden = true; return; }

    const acquiring = pay.acquiring_percent;
    const installment = pay.installment_percent;
    const totalPercent = baseFee + acquiring + installment;

    const k = 1 - (totalPercent / 100);
    if (k <= 0) {
      setError("Итоговая комиссия >= 100%. Безубыточную цену посчитать нельзя.");
      els.result.hidden = true;
      return;
    }

    const price = Number((cogs / k).toFixed(2));
    const feeAmt = Number((price * totalPercent / 100).toFixed(2));
    const profit = Number((price - feeAmt - cogs).toFixed(2)); // должно быть ≈ 0.00

    els.r_base.textContent = formatPercent(baseFee);
    els.r_acq.textContent = formatPercent(acquiring);
    els.r_inst.textContent = formatPercent(installment);
    els.r_total.textContent = formatPercent(totalPercent);
    els.r_price.textContent = formatAZN(price);
    els.r_profit.textContent = formatAZN(profit);

    els.result.hidden = false;
  }

  // init selects
  const cats = buildCategories();
  fillSelect(els.category, cats.map(c => ({ value: c, label: c })), "Выберите категорию");
  fillSelect(els.payment, paymentMethods.map(p => ({ value: p.code, label: p.name })), "Выберите способ оплаты");

  els.category.addEventListener("change", onCategoryChange);
  els.subcategory.addEventListener("change", updateBtn);
  els.payment.addEventListener("change", updateBtn);
  els.cogs.addEventListener("input", updateBtn);
  els.calc.addEventListener("click", calculate);
  els.reset.addEventListener("click", reset);

  updateBtn();
}

// ===== Boot =====
async function init() {
  try {
    const [takeText, payText] = await Promise.all([
      fetch(TAKE_RATES_URL).then(r => r.text()),
      fetch(PAYMENT_METHODS_URL).then(r => r.text()),
    ]);

    const takeRows = parseCSV(takeText);
    const payRows = parseCSV(payText);

    takeRates = takeRows.map(r => ({
      category: r.category,
      subcategory: r.subcategory,
      marketplace_fee_percent: toNumber(r.marketplace_fee_percent) ?? 0,
    }));

    paymentMethods = payRows
      .map(r => ({
        code: r.code,
        name: r.name,
        acquiring_percent: toNumber(r.acquiring_percent) ?? 0,
        installment_percent: toNumber(r.installment_percent) ?? 0,
        sort: toNumber(r.sort) ?? 999,
        is_active: String(r.is_active).trim() === "1",
      }))
      .filter(p => p.is_active)
      .sort((a,b) => a.sort - b.sort);

    initTabs();
    initFeeCalc();
    initBepCalc();
  } catch (e) {
    console.error(e);
    alert("Не удалось загрузить CSV из /data. Проверь, что файлы лежат в папке data и сайт открыт через сервер (GitHub Pages / Live Server).");
  }
}

init();
