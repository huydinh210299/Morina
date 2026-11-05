const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");
const express = require("express");
const fs = require("node:fs");
const vm = require("node:vm");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const productService = require("../services/productService");

const productId = "507f1f77bcf86cd799439011";
const otherProductId = "507f1f77bcf86cd799439012";
const categoryId = "507f1f77bcf86cd799439013";
const orderId = "507f1f77bcf86cd799439014";
const product = { _id: productId, code: "VA01", size: "M", category: { code: "VA" }, imageUrl: "", fullDayPrice: 200000, sixHPrice: 100000 };
const chain = (result) => ({
  populate() { return this; }, sort() { return this; }, skip() { return this; },
  limit() { return this; }, select() { return this; }, lean: async () => result
});
const mockCatalog = (t, products = [product], count = products.length) => {
  t.mock.method(Category, "find", () => ({ sort: async () => [] }));
  const counted = t.mock.method(Product, "countDocuments", async () => count);
  const query = chain(products);
  const found = t.mock.method(Product, "find", () => query);
  return { counted, found, query };
};
const renderGallery = (data) => ejs.renderFile(path.join(__dirname, "../views/pages/products/images.ejs"), {
  ...data, formatCurrency: (value) => `${value} đ`, formatDateTime: (value) => new Date(value).toISOString()
});

test("rental gallery groups current and future item times by product, excludes past lines and sorts schedules", async (t) => {
  mockCatalog(t);
  let cutoff;
  t.mock.method(Order, "aggregate", async (pipeline) => {
    assert.equal(pipeline[0].$match.returned, false);
    cutoff = pipeline[0].$match["products.endTime"].$gte;
    assert.deepEqual(pipeline[1], { $unwind: "$products" });
    // Recheck the individual line: an upcoming line must not include past siblings.
    assert.equal(pipeline[2].$match["products.endTime"].$gte, cutoff);
    return [{ _id: productId }];
  });
  const offset = (ms) => new Date(cutoff.getTime() + ms);
  t.mock.method(Order, "find", (filter) => {
    assert.equal(filter.returned, false);
    assert.deepEqual(filter.products.$elemMatch.product.$in, [productId]);
    assert.equal(filter.products.$elemMatch.endTime.$gte, cutoff);
    return chain([
      { _id: orderId, customerName: "Lan <script>", phone: "0901234567", products: [
        { product: productId, startTime: offset(10000), endTime: offset(20000) },
        { product: productId, startTime: offset(-20000), endTime: offset(-1) },
        { product: otherProductId, startTime: offset(0), endTime: offset(30000) }
      ] },
      { _id: "507f1f77bcf86cd799439015", customerName: "Mai", phone: "0907654321", products: [
        { product: productId, startTime: offset(-10000), endTime: offset(5000) },
        { product: productId, startTime: offset(-5000), endTime: offset(0) }
      ] }
    ]);
  });

  const data = await productService.getRentalImageIndexData();
  assert.equal(data.products.length, 1);
  const schedule = data.products[0].rentSchedule;
  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule.map((item) => item.isCurrent), [true, true, false]);
  assert.equal(schedule[2].orderId, orderId);
  assert.equal(schedule[2].startTime.getTime(), cutoff.getTime() + 10000);
  const html = await renderGallery(data);
  assert.match(html, /Mẫu có lịch thuê/);
  assert.match(html, /Đang trong lịch thuê/);
  assert.match(html, /Sắp bắt đầu/);
  assert.match(html, new RegExp(`/orders/${orderId}`));
  assert.match(html, /Lan &lt;script&gt;/);
  assert.match(html, /Chưa có ảnh/);
  assert.ok(html.indexOf('data-product-image-preview') < html.indexOf('Đơn hàng và khung giờ thuê'));
});

test("rental gallery filters eligible products before counting and paginating, preserving filter URLs", async (t) => {
  const { counted, found, query } = mockCatalog(t, [product], 25);
  const skipped = t.mock.method(query, "skip", function () { return this; });
  const limited = t.mock.method(query, "limit", function () { return this; });
  t.mock.method(Order, "aggregate", async () => [{ _id: productId }, { _id: otherProductId }]);
  t.mock.method(Order, "find", () => chain([]));
  const data = await productService.getRentalImageIndexData({ category: categoryId, productCode: " VA.* ", size: "m", page: "999" });
  const filter = counted.mock.calls[0].arguments[0];
  assert.deepEqual(filter._id.$in, [productId, otherProductId]);
  assert.equal(filter.isDeleted, false);
  assert.equal(filter.category, categoryId);
  assert.equal(filter.code.$regex, "VA\\.\\*");
  assert.equal(filter.size.$regex, "^M$");
  assert.deepEqual(found.mock.calls[0].arguments[0], filter);
  assert.equal(data.pagination.currentPage, 2);
  assert.equal(data.pagination.totalItems, 25);
  assert.equal(skipped.mock.calls[0].arguments[0], 24);
  assert.equal(limited.mock.calls[0].arguments[0], 24);
  const html = await renderGallery(data);
  assert.match(html, new RegExp(`/products/rental-images\\?category=${categoryId}&amp;productCode=VA`));
  assert.match(html, /name="size" value="M"/);
  assert.match(html, /action="\/products\/rental-images"/);
});

test("empty rental gallery and malformed category render safely without loading order details", async (t) => {
  const { counted } = mockCatalog(t, []);
  t.mock.method(Order, "aggregate", async () => []);
  const foundOrders = t.mock.method(Order, "find", () => { throw new Error("No products to load"); });
  const data = await productService.getRentalImageIndexData({ page: "-1", size: "invalid" });
  assert.deepEqual(counted.mock.calls[0].arguments[0]._id, { $in: [] });
  assert.equal(data.filters.size, "");
  assert.equal(data.pagination.currentPage, 1);
  assert.equal(foundOrders.mock.callCount(), 0);
  assert.match(await renderGallery(data), /Không có mẫu nào đang trong lịch thuê/);
  const invalid = await productService.getRentalImageIndexData({ category: "invalid" });
  assert.equal(invalid.pagination.totalItems, 0);
  assert.equal(counted.mock.callCount(), 1);
  assert.match(await renderGallery(invalid), /Không có mẫu nào đang trong lịch thuê/);
});

test("ordinary image gallery still includes all products and never queries rental schedules", async (t) => {
  const { counted } = mockCatalog(t);
  t.mock.method(Order, "aggregate", () => { throw new Error("Should not query schedules"); });
  t.mock.method(Order, "find", () => { throw new Error("Should not query orders"); });
  const data = await productService.getImageIndexData();
  assert.deepEqual(counted.mock.calls[0].arguments[0], { isDeleted: false });
  assert.equal(data.gallery.path, "/products/images");
  const html = await renderGallery(data);
  assert.match(html, /Hình ảnh sản phẩm/);
  assert.doesNotMatch(html, /Đơn hàng và khung giờ thuê/);
});

test("category search matches unaccented text and clearing restores every option", () => {
  const listeners = {};
  const search = { value: "", addEventListener(event, handler) { listeners[event] = handler; } };
  const select = { options: [
    { value: "", textContent: "Tất cả danh mục" },
    { value: "1", textContent: "Áo dài" },
    { value: "2", textContent: "Váy đầm" }
  ] };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/js/product-image-filters.js"), "utf8"), {
    document: { querySelector: () => search, getElementById: () => select }
  });
  search.value = " dam ";
  listeners.input();
  assert.deepEqual(select.options.map((option) => option.hidden), [false, true, false]);
  search.value = "";
  listeners.input();
  assert.ok(select.options.every((option) => !option.hidden));
});

test("rental image route requires authentication and supports both staff and admin reads", async (t) => {
  t.mock.method(productService, "getRentalImageIndexData", async (query) => ({ filters: query }));
  const app = express();
  app.use((req, res, next) => {
    req.session = {};
    req.user = req.headers["x-role"] ? { role: req.headers["x-role"] } : null;
    res.render = (view, data) => res.json({ view, data });
    next();
  });
  app.use("/products", require("../routes/productRoutes"));
  const server = await new Promise((resolve) => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (role) => fetch(`http://127.0.0.1:${server.address().port}/products/rental-images?size=M`, {
    headers: role ? { "x-role": role } : {}, redirect: "manual"
  });
  assert.equal((await request()).headers.get("location"), "/auth/login");
  for (const role of ["staff", "admin"]) {
    const response = await request(role);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { view: "pages/products/images", data: { filters: { size: "M" } } });
  }
  assert.equal((await request("guest")).headers.get("location"), "/dashboard");
});
