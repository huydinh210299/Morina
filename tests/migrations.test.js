const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const loadRunner = (migrations) => {
  const calls = [];
  const module = { exports: {} };
  const mongoose = {
    connection: {},
    connect: async () => calls.push("connect"),
    disconnect: async () => calls.push("disconnect")
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../scripts/migrate.js"), "utf8"), {
    module, console: { log() {} }, process,
    require(name) {
      if (name === "dotenv") return { config() {} };
      if (name === "mongoose") return mongoose;
      return migrations[name];
    }
  });
  return { ...module.exports, calls };
};

const migrationNames = ["./remove-uuid-ids", "./add-payment-date", "./add-user-active", "./backfill-customers"];

test("importing migrations does not connect, disconnect, or execute anything", () => {
  const { calls, runMigrations } = loadRunner({});
  assert.equal(typeof runMigrations, "function");
  assert.deepEqual(calls, []);
});

test("pending migrations run in order once and subsequent startup skips them", async () => {
  const records = new Map();
  const applied = [];
  const history = {
    async createIndex() {},
    async findOne(filter) { return records.get(filter.name || filter._id); },
    async insertOne(record) { records.set(record.name, record); }
  };
  const migrations = Object.fromEntries(migrationNames.map((name) => [name, {
    id: name, description: name, async up(db) { assert.ok(db); applied.push(name); }
  }]));
  const { runMigrations, calls } = loadRunner(migrations);
  const db = { collection: () => history };
  await runMigrations(db);
  await runMigrations(db);
  assert.deepEqual(applied, migrationNames);
  assert.equal(records.size, 4);
  assert.deepEqual(calls, []);
});

test("migration failure propagates and is not recorded as complete", async () => {
  let recorded = false;
  const { runMigrations } = loadRunner({ [migrationNames[0]]: {
    id: "failed", async up() { throw new Error("migration failed"); }
  } });
  const history = { async createIndex() {}, async findOne() { return null; }, async insertOne() { recorded = true; } };
  await assert.rejects(runMigrations({ collection: () => history }), /migration failed/);
  assert.equal(recorded, false);
});

const simulateStartup = async (failMigration) => {
  const calls = [];
  const app = { set() {}, use() {}, get() {}, listen() { calls.push("listen"); } };
  const express = Object.assign(() => app, { urlencoded() {}, json() {}, static() {} });
  const startupTasks = {
    "./config/db": async () => calls.push("connect"),
    "./scripts/migrate": { async runMigrations() {
      calls.push("migrate");
      if (failMigration) throw new Error("migration failed");
    } },
    "./utils/seedAdmin": async () => calls.push("seedAdmin"),
    "./utils/seedSettings": async () => calls.push("seedSettings"),
    "./utils/seedCatalogData": async () => calls.push("seedCatalog")
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../server.js"), "utf8"), {
    __dirname: path.join(__dirname, ".."),
    console: { error() {}, log() {} },
    process: { env: {}, exit: (code) => calls.push(`exit:${code}`) },
    require(name) {
      if (name === "dotenv") return { config() {} };
      if (name === "path") return path;
      if (name === "express") return express;
      if (startupTasks[name]) return startupTasks[name];
      if (["cookie-parser", "method-override", "express-session"].includes(name)) return () => {};
      return {};
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  return calls;
};

test("startup finishes migrations before seeding and accepting requests", async () => {
  assert.deepEqual(await simulateStartup(false), ["connect", "migrate", "seedAdmin", "seedSettings", "seedCatalog", "listen"]);
});

test("startup fails before seeding or listening when migration fails", async () => {
  assert.deepEqual(await simulateStartup(true), ["connect", "migrate", "exit:1"]);
});

test("UUID migration tolerates missing collections on a fresh database", async () => {
  const { up } = require("../scripts/remove-uuid-ids");
  const collection = {
    find: () => ({ toArray: async () => [] }),
    async indexes() { throw Object.assign(new Error("namespace missing"), { code: 26 }); },
    async updateMany() { return { modifiedCount: 0 }; }
  };
  await up({ collection: () => collection });
  collection.indexes = async () => { throw new Error("permission denied"); };
  await assert.rejects(up({ collection: () => collection }), /permission denied/);
});
