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

const orderForm = document.querySelector("form[data-conflict-check-url]");
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

const productImageModal = document.querySelector("[data-product-image-modal]");
const productImageModalImg = productImageModal?.querySelector("[data-product-image-modal-img]");
const productImageModalEmpty = productImageModal?.querySelector("[data-product-image-modal-empty]");
const productImageModalCode = productImageModal?.querySelector("[data-product-image-modal-code]");
const productImageModalCategory = productImageModal?.querySelector("[data-product-image-modal-category]");
const productImageModalSize = productImageModal?.querySelector("[data-product-image-modal-size]");
const productImageModalDetail = productImageModal?.querySelector("[data-product-image-modal-detail]");

const closeProductImageModal = () => {
  if (!productImageModal) {
    return;
  }

  productImageModal.classList.add("hidden");
  productImageModal.classList.remove("flex");
  productImageModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");

  if (productImageModalImg) {
    productImageModalImg.src = "";
    productImageModalImg.alt = "";
  }
};

const openProductImageModal = (trigger) => {
  if (!productImageModal || !trigger) {
    return;
  }

  const imageUrl = trigger.dataset.productImageUrl || "";
  const productCode = trigger.dataset.productCode || "";
  const categoryCode = trigger.dataset.productCategory || "";
  const productSize = trigger.dataset.productSize || "";
  const detailUrl = trigger.dataset.productDetailUrl || "#";

  if (productImageModalCode) {
    productImageModalCode.textContent = productCode;
  }

  if (productImageModalCategory) {
    productImageModalCategory.textContent = categoryCode;
  }

  if (productImageModalSize) {
    productImageModalSize.textContent = `Kích thước: ${productSize || "Chưa có"}`;
  }

  if (productImageModalDetail) {
    productImageModalDetail.href = detailUrl;
  }

  if (productImageModalImg && productImageModalEmpty) {
    productImageModalImg.classList.toggle("hidden", !imageUrl);
    productImageModalEmpty.classList.toggle("hidden", Boolean(imageUrl));
    productImageModalImg.src = imageUrl;
    productImageModalImg.alt = productCode;
  }

  productImageModal.classList.remove("hidden");
  productImageModal.classList.add("flex");
  productImageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
};

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

const getConflictOverrideInput = () => orderForm?.querySelector("[data-conflict-override]");

const resetConflictOverride = () => {
  const conflictOverrideInput = getConflictOverrideInput();
  if (conflictOverrideInput) {
    conflictOverrideInput.value = "false";
  }
};

const formatConflictDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
};

const buildConflictConfirmMessage = (result) => {
  const lines = [
    result.message || "Có sản phẩm trùng lịch với đơn hàng chưa hoàn tất."
  ];

  result.conflicts.slice(0, 6).forEach((conflict, index) => {
    lines.push(
      `${index + 1}. ${conflict.productLabel || "Sản phẩm"} | Đơn ${conflict.orderCode} | ${conflict.customerName || "Khách hàng"} | ${formatConflictDateTime(conflict.startTime)} - ${formatConflictDateTime(conflict.endTime)}`
    );
  });

  if (result.conflicts.length > 6) {
    lines.push(`... còn ${result.conflicts.length - 6} lượt trùng khác.`);
  }

  lines.push("Bạn có muốn tiếp tục lưu đơn hàng không?");
  return lines.join("\n");
};

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

  orderForm.addEventListener("submit", async (event) => {
    const conflictOverrideInput = getConflictOverrideInput();

    if (conflictOverrideInput?.value === "true") {
      return;
    }

    event.preventDefault();

    try {
      const response = await fetch(orderForm.dataset.conflictCheckUrl || "/orders/conflicts", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams(new FormData(orderForm)).toString()
      });

      if (!response.ok) {
        orderForm.submit();
        return;
      }

      const result = await response.json();

      if (!result.hasConflicts) {
        orderForm.submit();
        return;
      }

      if (window.confirm(buildConflictConfirmMessage(result))) {
        if (conflictOverrideInput) {
          conflictOverrideInput.value = "true";
        }
        orderForm.submit();
      }
    } catch (error) {
      orderForm.submit();
    }
  });
}

document.addEventListener("click", (event) => {
  const productPreview = event.target.closest("[data-product-image-preview]");
  if (productPreview) {
    openProductImageModal(productPreview);
    return;
  }

  if (event.target.closest("[data-product-image-modal-close]")) {
    closeProductImageModal();
    return;
  }

  if (productImageModal && event.target === productImageModal) {
    closeProductImageModal();
    return;
  }

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
  if (orderForm && orderForm.contains(event.target) && !event.target.matches("[data-conflict-override]")) {
    resetConflictOverride();
  }

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
  if (orderForm && orderForm.contains(event.target) && !event.target.matches("[data-conflict-override]")) {
    resetConflictOverride();
  }

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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && productImageModal && !productImageModal.classList.contains("hidden")) {
    closeProductImageModal();
  }
});
