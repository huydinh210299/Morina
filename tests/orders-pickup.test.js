const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const ejs = require("ejs");
const Order = require("../models/Order");
const orderService = require("../services/orderService");

const orderId = "507f1f77bcf86cd799439011";
const user = { _id: "507f1f77bcf86cd799439012" };
const makeOrder = (start, end) => {
  const order = {
    _id: orderId,
    generalStartTime: new Date(start),
    generalEndTime: new Date(end),
    products: [{ product: "507f1f77bcf86cd799439013", useGeneralTimes: true, startTime: new Date(start), endTime: new Date(end) }],
    accessories: [{ useGeneralTimes: true, startTime: new Date(start), endTime: new Date(end) }],
    alreadyPickup: false,
    saved: 0,
    async save() { this.saved += 1; }
  };
  return order;
};

test("pickup keeps existing same-day hours and saves status with rental dates", async (t) => {
  const order = makeOrder("2026-10-27T09:00", "2026-10-27T15:00");
  t.mock.method(Order, "findById", async () => order);
  const find = t.mock.method(Order, "find", () => { throw new Error("Unchanged dates should not check conflicts"); });

  await orderService.updateOrderStatus({ id: orderId, body: {
    action: "pickup", generalStartTime: "2026-10-27T09:00", generalEndTime: "2026-10-27T15:00"
  }, user });

  assert.equal(order.alreadyPickup, true);
  assert.equal(order.saved, 1);
  assert.equal(order.products[0].startTime.getTime(), order.generalStartTime.getTime());
  assert.equal(find.mock.callCount(), 0);
});

test("pickup updates both daily rental hours and linked item times", async (t) => {
  const order = makeOrder("2026-10-27T19:16", "2026-10-29T19:16");
  t.mock.method(Order, "findById", async () => order);
  t.mock.method(Order, "find", () => ({ populate() { return this; }, select: async () => [] }));

  await orderService.updateOrderStatus({ id: orderId, body: {
    action: "pickup", generalStartTime: "2026-10-27T10:02", generalEndTime: "2026-10-29T10:02"
  }, user });

  assert.equal(order.generalStartTime.getTime(), new Date("2026-10-27T10:02").getTime());
  assert.equal(order.generalEndTime.getTime(), new Date("2026-10-29T10:02").getTime());
  assert.equal(order.products[0].endTime.getTime(), order.generalEndTime.getTime());
  assert.equal(order.accessories[0].startTime.getTime(), order.generalStartTime.getTime());
  assert.equal(order.alreadyPickup, true);
  assert.equal(order.saved, 1);
});

test("invalid or conflicting pickup dates leave the order unconfirmed", async (t) => {
  const order = makeOrder("2026-10-27T19:16", "2026-10-29T19:16");
  t.mock.method(Order, "findById", async () => order);
  t.mock.method(Order, "find", () => ({ populate() { return this; }, select: async () => [{
    _id: "507f1f77bcf86cd799439014", customerName: "Khách khác", products: [{
      product: { _id: order.products[0].product, code: "SP01" },
      startTime: new Date("2026-10-27T08:00"), endTime: new Date("2026-10-29T18:00")
    }]
  }] }));

  await assert.rejects(orderService.updateOrderStatus({ id: orderId, body: {
    action: "pickup", generalStartTime: "2026-10-29T12:00", generalEndTime: "2026-10-27T12:00"
  }, user }), { statusCode: 400 });
  await assert.rejects(orderService.updateOrderStatus({ id: orderId, body: {
    action: "pickup", generalStartTime: "2026-10-27T10:02", generalEndTime: "2026-10-29T10:02"
  }, user }), { statusCode: 409 });

  assert.equal(order.alreadyPickup, false);
  assert.equal(order.generalStartTime.getTime(), new Date("2026-10-27T19:16").getTime());
  assert.equal(order.saved, 0);
});

test("order details render editable pickup dates in the confirmation dialog", async () => {
  const order = {
    ...makeOrder("2026-10-27T09:00", "2026-10-27T15:00"),
    customerName: "Mai Lan", phone: "0901234567", orderAmount: 235000,
    surcharge: 0, deposit: 300000, payments: [], bookship: false,
    returned: false, returnDeposit: false, note: ""
  };
  const html = await ejs.renderFile(path.join(__dirname, "../views/pages/orders/view.ejs"), {
    order,
    formatCurrency: (value) => `${value} đ`,
    formatDateTime: (value) => new Date(value).toISOString(),
    formatDateTimeLocal: (value) => {
      const date = new Date(value);
      const pad = (part) => String(part).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  });

  assert.match(html, /data-pickup-open/);
  assert.match(html, /data-original-start="2026-10-27T09:00"/);
  assert.match(html, /data-original-end="2026-10-27T15:00"/);
  assert.match(html, /name="generalStartTime" type="datetime-local" required/);
  assert.match(html, /name="generalEndTime" type="datetime-local" required/);
  assert.match(html, /name="action" value="pickup"/);
});

test("pickup dialog keeps same-day hours and uses current hours for different days", () => {
  const listeners = {};
  const startInput = { value: "" };
  const endInput = { value: "" };
  const error = { classList: { add() {} } };
  const form = {
    querySelector(selector) {
      if (selector.includes("generalStartTime")) return startInput;
      if (selector.includes("generalEndTime")) return endInput;
      if (selector === "[data-pickup-error]") return error;
      return null;
    },
    addEventListener() {}
  };
  const modal = {
    dataset: {}, open: false,
    querySelector: () => form,
    showModal() { this.open = true; },
    close() { this.open = false; }
  };
  const document = {
    querySelector: (selector) => selector === "[data-pickup-modal]" ? modal : null,
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener(type, callback) { listeners[type] = callback; }
  };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ["2026-10-25T10:02:00"])); }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/js/app.js"), "utf8"), {
    document, window: {}, Date: FixedDate, Intl
  });
  const open = () => listeners.click({ target: { closest: (selector) => selector === "[data-pickup-open]" } });

  modal.dataset = { originalStart: "2026-10-27T09:00", originalEnd: "2026-10-27T15:00" };
  open();
  assert.equal(startInput.value, "2026-10-27T09:00");
  assert.equal(endInput.value, "2026-10-27T15:00");

  modal.close();
  modal.dataset = { originalStart: "2026-10-27T19:16", originalEnd: "2026-10-29T19:16" };
  open();
  assert.equal(startInput.value, "2026-10-27T10:02");
  assert.equal(endInput.value, "2026-10-29T10:02");
});
