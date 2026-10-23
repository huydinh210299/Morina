const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");
const express = require("express");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const customerService = require("../services/customerService");
const orderService = require("../services/orderService");
const migration = require("../scripts/backfill-customers");

const customerId = "507f1f77bcf86cd799439011";
const customer = { _id: customerId, name: "Nguyễn An", phone: "0901234567", totalOrder: 3 };

test("new and existing customers receive exactly one atomic increment per order", async (t) => {
  let stored;
  t.mock.method(Customer, "updateOne", async (filter, update) => {
    stored ||= { phone: filter.phone, ...update.$setOnInsert, totalOrder: 0 };
    stored.totalOrder += update.$inc.totalOrder;
  });
  await customerService.recordOrder({ phone: " 0901234567 ", customerName: " Nguyễn An " });
  assert.deepEqual(stored, { phone: "0901234567", name: "Nguyễn An", totalOrder: 1 });
  await customerService.recordOrder({ phone: "0901234567", customerName: "Tên mới" });
  assert.equal(stored.totalOrder, 2);
  assert.equal(stored.name, "Nguyễn An");
});

test("concurrent first-customer duplicate retries increment instead of failing", async (t) => {
  let calls = 0;
  t.mock.method(Customer, "updateOne", async () => {
    if (++calls === 1) throw Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { phone: 1 } });
  });
  await customerService.recordOrder({ phone: customer.phone, customerName: customer.name });
  assert.equal(calls, 2);
});

test("invalid edits, injected counters, and duplicate phones cannot overwrite customer data", async (t) => {
  t.mock.method(Customer, "findById", async () => customer);
  const writes = t.mock.method(Customer, "findByIdAndUpdate", async () => {});
  for (const body of [{ name: " ", phone: customer.phone }, { name: customer.name, phone: "" }, { name: customer.name, phone: customer.phone, totalOrder: 999 }]) {
    await assert.rejects(customerService.updateCustomer({ id: customerId, body }), { statusCode: 400 });
  }
  assert.equal(writes.mock.callCount(), 0);
  t.mock.method(Customer, "findByIdAndUpdate", async () => { throw { code: 11000 }; });
  await assert.rejects(customerService.updateCustomer({ id: customerId, body: { name: customer.name, phone: customer.phone } }), /Số điện thoại này đã thuộc/);
});

test("customer edits preserve counters; malformed IDs return a Vietnamese not-found error", async (t) => {
  t.mock.method(Customer, "findById", async () => customer);
  const writes = t.mock.method(Customer, "findByIdAndUpdate", async () => {});
  await customerService.updateCustomer({ id: customerId, body: { name: " An ", phone: " 0909999999 " } });
  assert.deepEqual(writes.mock.calls[0].arguments[1], { $set: { name: "An", phone: "0909999999" } });
  await assert.rejects(customerService.getEditData("invalid"), { statusCode: 404 });
});

test("customer search escapes regex and clamps pages", async (t) => {
  let filter;
  let skip;
  t.mock.method(Customer, "countDocuments", async (value) => { filter = value; return 12; });
  const chain = { sort() { return this; }, skip(value) { skip = value; return this; }, limit: async () => [customer] };
  t.mock.method(Customer, "find", () => chain);
  const data = await customerService.getIndexData({ keyword: "  An.*  ", page: "999" });
  assert.equal(filter.$or[0].name.$regex, "An\\.\\*");
  assert.deepEqual(data.pagination, { page: 2, totalPages: 2, totalItems: 12 });
  assert.equal(skip, 10);
  await customerService.getIndexData({ keyword: " " });
  assert.deepEqual(filter, {});
});

test("order creation records a customer only after validation and saving succeeds", async (t) => {
  const created = t.mock.method(Order, "create", async () => ({ _id: customerId }));
  const recorded = t.mock.method(customerService, "recordOrder", async () => {});
  const req = { user: { _id: customerId, role: "admin" }, body: {
    customerName: customer.name, phone: customer.phone, surcharge: 0, deposit: 0,
    generalStartTime: "2026-10-23", generalEndTime: "2026-10-24"
  } };
  await orderService.createOrder(req);
  assert.equal(created.mock.callCount(), 1);
  assert.equal(recorded.mock.callCount(), 1);
  assert.equal(recorded.mock.calls[0].arguments[0].phone, customer.phone);
  await assert.rejects(orderService.createOrder({ ...req, body: { ...req.body, phone: "" } }));
  assert.equal(recorded.mock.callCount(), 1);
  t.mock.method(Order, "create", async () => { throw new Error("save failed"); });
  await assert.rejects(orderService.createOrder(req), /save failed/);
  assert.equal(recorded.mock.callCount(), 1);
});

test("failed customer tracking removes the just-created order", async (t) => {
  t.mock.method(Order, "create", async () => ({ _id: customerId }));
  t.mock.method(customerService, "recordOrder", async () => { throw new Error("tracking failed"); });
  const removed = t.mock.method(Order, "findByIdAndDelete", async () => {});
  await assert.rejects(orderService.createOrder({ user: { _id: customerId, role: "admin" }, body: {
    customerName: customer.name, phone: customer.phone, surcharge: 0, deposit: 0,
    generalStartTime: "2026-10-23", generalEndTime: "2026-10-24"
  } }), /tracking failed/);
  assert.equal(removed.mock.calls[0].arguments[0], customerId);
});

test("migration batches large histories and retries with absolute counts", async () => {
  const records = new Map();
  const batches = [];
  const db = { collection(name) {
    if (name === "customers") return {
      async createIndex(keys, options) { assert.deepEqual(keys, { phone: 1 }); assert.equal(options.unique, true); },
      async bulkWrite(operations) {
        batches.push(operations.length);
        for (const { updateOne: { filter, update } } of operations) records.set(filter.phone, update.$set);
      }
    };
    return {
      aggregate(pipeline) {
        assert.deepEqual(pipeline[3], { $sort: { createdAt: -1, _id: -1 } });
        assert.deepEqual(pipeline[4].$group.totalOrder, { $sum: 1 });
        return (async function* () {
          for (let i = 0; i < 501; i++) yield { _id: `090${i}`, name: " An ", totalOrder: 2 };
        })();
      },
      async countDocuments() { return 1003; }
    };
  } };
  await migration.up(db);
  await migration.up(db);
  assert.deepEqual(batches, [500, 1, 500, 1]);
  assert.equal(records.size, 501);
  assert.equal(records.get("0900").totalOrder, 2);
  assert.equal(records.get("0900").name, "An");
});

test("customer routes allow staff reads and block every staff write", async (t) => {
  t.mock.method(customerService, "getIndexData", async () => ({ customers: [] }));
  t.mock.method(customerService, "getEditData", async () => ({ customer }));
  const updated = t.mock.method(customerService, "updateCustomer", async () => {});
  const removed = t.mock.method(customerService, "deleteCustomer", async () => {});
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {};
    req.user = req.headers["x-role"] ? { role: req.headers["x-role"] } : null;
    res.render = (view, data) => res.json({ view, data });
    next();
  });
  app.use("/customers", require("../routes/customerRoutes"));
  const server = await new Promise((resolve) => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (role, method, suffix = "") => fetch(`http://127.0.0.1:${server.address().port}/customers${suffix}`, {
    method, headers: role ? { "x-role": role } : {}, redirect: "manual"
  });
  assert.equal((await request(null, "GET")).headers.get("location"), "/auth/login");
  assert.equal((await request("staff", "GET")).status, 200);
  assert.equal((await request("admin", "GET")).status, 200);
  for (const [method, suffix] of [["GET", `/${customerId}/edit`], ["PUT", `/${customerId}`], ["DELETE", `/${customerId}`]]) {
    assert.equal((await request("staff", method, suffix)).headers.get("location"), "/dashboard");
  }
  assert.equal(updated.mock.callCount(), 0);
  assert.equal(removed.mock.callCount(), 0);
  assert.equal((await request("admin", "GET", `/${customerId}/edit`)).status, 200);
  await request("admin", "PUT", `/${customerId}`);
  await request("admin", "DELETE", `/${customerId}`);
  assert.equal(updated.mock.callCount(), 1);
  assert.equal(removed.mock.callCount(), 1);
});

test("customer templates escape names and show editing only to admins", async () => {
  const filename = path.join(__dirname, "../views/pages/customers/index.ejs");
  const data = { customers: [{ ...customer, name: "<script>" }], keyword: "An", pagination: { page: 2, totalPages: 3, totalItems: 21 } };
  const staff = await ejs.renderFile(filename, { ...data, currentUser: { role: "staff" } });
  assert.match(staff, /&lt;script&gt;/);
  assert.doesNotMatch(staff, /_method=DELETE|\/edit/);
  assert.match(staff, /page=3&amp;keyword=An/);
  const admin = await ejs.renderFile(filename, { ...data, currentUser: { role: "admin" } });
  assert.match(admin, /_method=DELETE/);
  const empty = await ejs.renderFile(filename, { ...data, customers: [], currentUser: { role: "staff" } });
  assert.match(empty, /Không có dữ liệu/);
  const form = await ejs.renderFile(path.join(__dirname, "../views/pages/customers/form.ejs"), { title: "Chỉnh sửa khách hàng", customer, error: "Số điện thoại đã tồn tại." });
  assert.match(form, /role="alert"/);
});
