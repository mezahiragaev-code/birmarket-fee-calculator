const TAKE_RATES_URL = "data/take_rates.csv";
const PAYMENT_METHODS_URL = "data/payment_methods.csv";

const els = {
  category: document.getElementById("category"),
  subcategory: document.getElementById("subcategory"),
  price: document.getElementById("price"),
  payment: document.getElementById("payment"),
  calc: document.getElementById("calc"),
  reset: document.getElementById("reset"),
  err: document.getElementById("err"),
  result: document.getElementById("result"),
  r_base: document.getElementById("r_base"),
  r_acq: document.getElementById("r_acq"),
  r_inst: document.getElementById("r_inst"),
  r_total: document.getElementById("r_total"),
  r_fee_amt: document.getElementById("r_fee_amt"),
  r_income: document.getElementById("r_income"),
};

let takeRates = [];
let paymentMethods = [];

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

function setError(msg) { els.err.textContent = msg || ""; }

function isFormValid() {
  const price = toNumber(els.price.value);
  return (
    els.subcategory.value !== "" &&
    els.payment.value !== "" &&
    price !== null &&
    price >= 0.01
  );
}

function updateCalcButton() {
  els.calc.disabled = !isFormValid();
}

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

function onCategoryChange() {
  const cat = els.category.value;
  if (!cat) {
    els.subcategory.disabled = true;
    fillSelect(els.subcategory, [], "Выберите подкатегорию");
    updateCalcButton();
    return;
  }

  const subs = takeRates
    .filter(r => r.category === cat)
    .map(r => r.subcategory)
    .sort((a,b) => a.localeCompare(b, "ru"));

  fillSelect(
    els.subcategory,
    subs.map(s => ({ value: s, label: s })),
    "Выберите подкатегорию"
  );

  els.subcategory.disabled = false;
  updateCalcButton();
}

function getBaseFee(category, subcategory) {
  const row = takeRates.find(r => r.category === category && r.subcategory === subcategory);
  return row ? row.marketplace_fee_percent : null;
}

function getPaymentConfig(code) {
  return paymentMethods.find(p => p.code === code) || null;
}

function calculate() {
  setError("");

  if (!isFormValid()) {
    setError("Заполни подкатегорию, цену и способ оплаты.");
    els.result.hidden = true;
    return;
  }

  const category = els.category.value;
  const subcategory = els.subcategory.value;
  const price = toNumber(els.price.value);
  const payCode = els.payment.value;

  const baseFee = getBaseFee(category, subcategory);
  const pay = getPaymentConfig(payCode);

  if (baseFee === null) {
    setError("Не найдена базовая комиссия для выбранной подкатегории.");
    els.result.hidden = true;
    return;
  }
  if (!pay) {
    setError("Не найден способ оплаты.");
    els.result.hidden = true;
    return;
  }

  const acquiring = pay.acquiring_percent;
  const installment = pay.installment_percent;

  const totalPercent = baseFee + acquiring + installment;

  const commissionAmountRaw = price * totalPercent / 100;
  const incomeRaw = price - commissionAmountRaw;

  const commissionAmount = Number(commissionAmountRaw.toFixed(2));
  const income = Number(incomeRaw.toFixed(2));

  els.r_base.textContent = formatPercent(baseFee);
  els.r_acq.textContent = formatPercent(acquiring);
  els.r_inst.textContent = formatPercent(installment);
  els.r_total.textContent = formatPercent(totalPercent);
  els.r_fee_amt.textContent = formatAZN(commissionAmount);
  els.r_income.textContent = formatAZN(income);

  els.result.hidden = false;
}

function resetForm() {
  setError("");
  els.category.value = "";
  els.subcategory.disabled = true;
  fillSelect(els.subcategory, [], "Выберите подкатегорию");
  els.price.value = "";
  els.payment.value = "";
  els.result.hidden = true;
  updateCalcButton();
}

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

    const categories = Array.from(new Set(takeRates.map(r => r.category)))
      .sort((a,b) => a.localeCompare(b, "ru"));

    fillSelect(
      els.category,
      categories.map(c => ({ value: c, label: c })),
      "Выберите категорию"
    );

    fillSelect(
      els.payment,
      paymentMethods.map(p => ({ value: p.code, label: p.name })),
      "Выберите способ оплаты"
    );

    els.category.addEventListener("change", onCategoryChange);
    els.subcategory.addEventListener("change", updateCalcButton);
    els.payment.addEventListener("change", updateCalcButton);
    els.price.addEventListener("input", updateCalcButton);
    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", resetForm);

    updateCalcButton();
  } catch (e) {
    setError("Не удалось загрузить данные CSV. Проверь, что файлы лежат в /data и сайт открыт через сервер (Live Server / GitHub Pages).");
    console.error(e);
  }
}

init();
