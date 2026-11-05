(() => {
  const search = document.querySelector("[data-image-category-search]");
  const select = document.getElementById("image-category-filter");
  if (!search || !select) return;

  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  search.addEventListener("input", () => {
    const keyword = normalize(search.value.trim());
    for (const option of select.options) {
      option.hidden = Boolean(option.value) && !normalize(option.textContent).includes(keyword);
    }
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      select.focus();
    }
  });
})();
