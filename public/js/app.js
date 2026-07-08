const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCode = (value) => `${value || ""}`.trim().toUpperCase();

const orderForm = document.querySelector('form[action="/orders"], form[action^="/orders/"]');
const orderFormDataNode = document.getElementById("order-form-data");
const orderFormData = orderFormDataNode ? JSON.parse(orderFormDataNode.textContent) : { products: [], accessories: [] };

const productByCode = new Map(orderFormData.products.map((product) => [normalizeCode(product.code), product]));
const productById = new Map(orderFormData.products.map((product) => [product.id, product]));
const accessoryById = new Map(orderFormData.accessories.map((accessory) => [accessory.id, accessory]));

const normalizeSearch = (value) => `${value || ""}`.trim().toLowerCase();
const getSearchItems = (type) => (type === "product" ? orderFormData.products : orderFormData.accessories);
const getSearchItemById = (type, id) => (type === "product" ? productById.get(id) : accessoryById.get(id));
const getSearchItemPrice = (type, item) => (type === "product" ? item?.fullDayPrice : item?.price);
const findExactSearchItem = (type, value) => {
  const normalizedValue = normalizeSearch(value);
  return getSearchItems(type).find(
    (item) => normalizeSearch(item.label) === normalizedValue || normalizeSearch(item.code) === normalizedValue
  );
};
const escapeHtml = (value) =>
  `${value || ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const closeSearchDropdown = (wrapper) => {
  const dropdown = wrapper?.querySelector("[data-search-dropdown]");
  if (!dropdown) {
    return;
  }

  dropdown.classList.add("hidden");
  dropdown.innerHTML = "";
};

const applySearchSelection = (wrapper, item) => {
  if (!wrapper) {
    return;
  }

  const input = wrapper.querySelector("[data-search-input]");
  const hiddenInput =
    wrapper.querySelector("[data-product-id-input]") ||
    wrapper.querySelector("[data-accessory-id-input]");
  const row = wrapper.closest("[data-line-row]");
  const type = wrapper.dataset.searchSelect;

  if (input) {
    input.value = item?.label || "";
  }

  if (hiddenInput) {
    hiddenInput.value = item?.id || "";
  }

  if (!row || !item) {
    return;
  }

  const priceInput = row.querySelector(type === "product" ? 'input[name="productPrices"]' : 'input[name="accessoryPrices"]');
  if (priceInput) {
    priceInput.value = getSearchItemPrice(type, item) ?? priceInput.value;
  }
};

const renderSearchOptions = (wrapper, query = "") => {
  if (!wrapper) {
    return;
  }

  const dropdown = wrapper.querySelector("[data-search-dropdown]");
  const type = wrapper.dataset.searchSelect;
  const items = getSearchItems(type);

  if (!dropdown || !type) {
    return;
  }

  const normalizedQuery = normalizeSearch(query);
  const filteredItems = items.filter((item) => !normalizedQuery || item.searchText.includes(normalizedQuery));

  if (filteredItems.length === 0) {
    dropdown.innerHTML =
      '<div class="rounded-xl px-3 py-2 text-sm text-slate-500">Không tìm thấy kết quả phù hợp.</div>';
  } else {
    dropdown.innerHTML = filteredItems
      .map(
        (item) => `
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            data-search-option
            data-search-type="${type}"
            data-id="${item.id}"
          >
            <span class="block text-sm font-semibold text-slate-700">${escapeHtml(item.label)}</span>
            <span class="ml-3 text-xs text-slate-400">${currencyFormatter.format(getSearchItemPrice(type, item) || 0)}</span>
          </button>
        `
      )
      .join("");
  }

  dropdown.classList.remove("hidden");
};

const addRow = (templateId, containerId) => {
  const template = document.getElementById(templateId);
  const container = document.getElementById(containerId);

  if (!template || !container) {
    return;
  }

  container.insertAdjacentHTML("beforeend", template.innerHTML.trim());
};

const getGeneralTimeInputs = () => ({
  start: document.querySelector('input[name="generalStartTime"]'),
  end: document.querySelector('input[name="generalEndTime"]')
});

const updateLineTimeState = (row) => {
  const toggle = row.querySelector("[data-use-general-toggle]");
  const startInput = row.querySelector("[data-line-start]");
  const endInput = row.querySelector("[data-line-end]");
  const hint = row.querySelector("[data-line-time-hint]");
  const timeFields = row.querySelector("[data-line-time-fields]");

  if (!toggle || !startInput || !endInput) {
    return;
  }

  const { start, end } = getGeneralTimeInputs();
  const usesGeneral = toggle.checked;

  if (usesGeneral) {
    if (start) {
      startInput.value = start.value;
    }
    if (end) {
      endInput.value = end.value;
    }
  }

  if (timeFields) {
    timeFields.classList.toggle("opacity-60", usesGeneral);
  }

  if (hint) {
    hint.textContent = usesGeneral
      ? "Dòng này sẽ dùng thời gian thuê chung của đơn hàng."
      : "Dòng này dùng thời gian thuê riêng.";
  }
};

const syncAllLineTimes = () => {
  document.querySelectorAll("[data-line-row]").forEach(updateLineTimeState);
};

const autofillProductRow = (row) => {
  const wrapper = row.querySelector('[data-search-select="product"]');
  const codeInput = row.querySelector("[data-product-code-input]");
  const idInput = row.querySelector("[data-product-id-input]");

  if (!codeInput || !idInput) {
    return;
  }

  const product = productByCode.get(normalizeCode(codeInput.value)) || findExactSearchItem("product", codeInput.value);

  if (!product) {
    idInput.value = "";
    return;
  }

  applySearchSelection(wrapper, product);
};

const autofillAccessoryRow = (row) => {
  const wrapper = row.querySelector('[data-search-select="accessory"]');
  const input = row.querySelector("[data-accessory-select]");
  const idInput = row.querySelector("[data-accessory-id-input]");

  if (!input || !idInput) {
    return;
  }

  const exactMatch = findExactSearchItem("accessory", input.value);
  const accessory = exactMatch || accessoryById.get(idInput.value);

  if (!accessory) {
    idInput.value = "";
    return;
  }

  applySearchSelection(wrapper, accessory);
};

const updateOrderAmountState = () => {
  const surchargeInput = document.querySelector('input[name="surcharge"]');
  const depositInput = document.querySelector('input[name="deposit"]');
  const orderAmountInput = document.querySelector("[data-order-amount-input]");
  const totalDisplay = document.querySelector("[data-calculated-total-display]");
  const totalWithDepositDisplay = document.querySelector("[data-total-with-deposit-display]");
  const hint = document.querySelector("[data-order-amount-hint]");

  if (!orderAmountInput || !totalDisplay) {
    return;
  }

  const productTotal = Array.from(document.querySelectorAll('input[name="productPrices"]')).reduce(
    (sum, input) => sum + toNumber(input.value),
    0
  );
  const accessoryTotal = Array.from(document.querySelectorAll('input[name="accessoryPrices"]')).reduce(
    (sum, input) => sum + toNumber(input.value),
    0
  );
  const calculated = productTotal + accessoryTotal + toNumber(surchargeInput?.value);
  const manualOverride = orderAmountInput.dataset.manualOverride === "true";

  totalDisplay.textContent = currencyFormatter.format(calculated);

  if (!manualOverride) {
    orderAmountInput.value = calculated;
  }

  const currentFinal = toNumber(orderAmountInput.value);
  const totalWithDeposit = currentFinal + toNumber(depositInput?.value);
  const discount = calculated - currentFinal;

  if (totalWithDepositDisplay) {
    totalWithDepositDisplay.textContent = `Tổng thu (gồm cọc): ${currencyFormatter.format(totalWithDeposit)}`;
  }

  hint.textContent =
    Math.abs(discount) < 0.01
      ? "Tổng cuối đang bằng tổng tính tự động."
      : `Chênh lệch so với tổng tự động: ${currencyFormatter.format(discount)}.`;
};

const initializeExistingRows = () => {
  document.querySelectorAll(".product-row").forEach((row) => {
    const idInput = row.querySelector("[data-product-id-input]");
    if (idInput?.value) {
      applySearchSelection(row.querySelector('[data-search-select="product"]'), productById.get(idInput.value));
    } else {
      closeSearchDropdown(row.querySelector('[data-search-select="product"]'));
    }
  });

  document.querySelectorAll(".accessory-row").forEach((row) => {
    const idInput = row.querySelector("[data-accessory-id-input]");
    if (idInput?.value) {
      applySearchSelection(row.querySelector('[data-search-select="accessory"]'), accessoryById.get(idInput.value));
      const priceInput = row.querySelector('input[name="accessoryPrices"]');
      if (priceInput && !priceInput.value) {
        autofillAccessoryRow(row);
      }
    }
  });
};

const initializeOrderAmountOverride = () => {
  const orderAmountInput = document.querySelector("[data-order-amount-input]");
  if (!orderAmountInput) {
    return;
  }

  const surchargeInput = document.querySelector('input[name="surcharge"]');
  const productTotal = Array.from(document.querySelectorAll('input[name="productPrices"]')).reduce(
    (sum, input) => sum + toNumber(input.value),
    0
  );
  const accessoryTotal = Array.from(document.querySelectorAll('input[name="accessoryPrices"]')).reduce(
    (sum, input) => sum + toNumber(input.value),
    0
  );
  const calculated = productTotal + accessoryTotal + toNumber(surchargeInput?.value);
  orderAmountInput.dataset.manualOverride = Math.abs(toNumber(orderAmountInput.value) - calculated) < 0.01 ? "false" : "true";
};

if (orderForm) {
  initializeExistingRows();
  initializeOrderAmountOverride();
  syncAllLineTimes();
  updateOrderAmountState();
}

document.addEventListener("click", (event) => {
  const addType = event.target.getAttribute("data-add-row");

  if (addType === "products") {
    addRow("product-row-template", "products-container");
    syncAllLineTimes();
    updateOrderAmountState();
  }

  if (addType === "accessories") {
    addRow("accessory-row-template", "accessories-container");
    syncAllLineTimes();
    updateOrderAmountState();
  }

  if (addType === "payments") {
    addRow("payment-row-template", "payments-container");
  }

  if (event.target.hasAttribute("data-reset-order-amount")) {
    const orderAmountInput = document.querySelector("[data-order-amount-input]");
    if (orderAmountInput) {
      orderAmountInput.dataset.manualOverride = "false";
      updateOrderAmountState();
    }
  }

  if (event.target.hasAttribute("data-remove-row")) {
    const row = event.target.closest(".product-row, .accessory-row, .payment-row");
    if (row) {
      row.remove();
      updateOrderAmountState();
    }
  }

  const option = event.target.closest("[data-search-option]");
  if (option) {
    const wrapper = option.closest("[data-search-select]");
    const item = getSearchItemById(option.dataset.searchType, option.dataset.id);
    applySearchSelection(wrapper, item);
    closeSearchDropdown(wrapper);
    updateOrderAmountState();
    return;
  }

  document.querySelectorAll("[data-search-select]").forEach((wrapper) => {
    if (!wrapper.contains(event.target)) {
      closeSearchDropdown(wrapper);
    }
  });
});

document.addEventListener("input", (event) => {
  const row = event.target.closest("[data-line-row]");

  if (event.target.matches("[data-product-code-input]") && row) {
    autofillProductRow(row);
    renderSearchOptions(event.target.closest("[data-search-select]"), event.target.value);
    updateOrderAmountState();
  }

  if (event.target.matches("[data-accessory-select]") && row) {
    autofillAccessoryRow(row);
    renderSearchOptions(event.target.closest("[data-search-select]"), event.target.value);
    updateOrderAmountState();
  }

  if (event.target.matches('input[name="productPrices"], input[name="accessoryPrices"], input[name="surcharge"], input[name="deposit"]')) {
    updateOrderAmountState();
  }

  if (event.target.matches("[data-order-amount-input]")) {
    const calculated = Array.from(document.querySelectorAll('input[name="productPrices"]')).reduce(
      (sum, input) => sum + toNumber(input.value),
      0
    ) +
      Array.from(document.querySelectorAll('input[name="accessoryPrices"]')).reduce(
        (sum, input) => sum + toNumber(input.value),
        0
      ) +
      toNumber(document.querySelector('input[name="surcharge"]')?.value);

    event.target.dataset.manualOverride = Math.abs(toNumber(event.target.value) - calculated) < 0.01 ? "false" : "true";
    updateOrderAmountState();
  }

  if (event.target.matches('input[name="generalStartTime"], input[name="generalEndTime"]')) {
    syncAllLineTimes();
  }
});

document.addEventListener("change", (event) => {
  const row = event.target.closest("[data-line-row]");

  if (event.target.matches("[data-use-general-toggle]") && row) {
    updateLineTimeState(row);
  }

  if (event.target.matches("[data-accessory-select]") && row) {
    autofillAccessoryRow(row);
    updateOrderAmountState();
  }
});

document.addEventListener("focusin", (event) => {
  if (event.target.matches("[data-search-input]")) {
    renderSearchOptions(event.target.closest("[data-search-select]"), event.target.value);
  }
});
