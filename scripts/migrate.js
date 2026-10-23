require("dotenv").config();

const mongoose = require("mongoose");

const migrations = [
  require("./remove-uuid-ids"),
  require("./add-payment-date"),
  require("./add-user-active"),
  require("./backfill-customers")
];
const HISTORY_COLLECTION = "migration_history";

const normalizeLegacyHistoryRecord = async (history, migration) => {
  const legacyRecord = await history.findOne({ _id: migration.id });

  if (!legacyRecord) {
    return null;
  }

  await history.updateOne(
    { name: migration.id },
    {
      $setOnInsert: {
        description: legacyRecord.description || migration.description,
        appliedAt: legacyRecord.appliedAt || new Date(),
        executionMs: legacyRecord.executionMs || 0
      }
    },
    { upsert: true }
  );
  await history.deleteOne({ _id: migration.id });

  return history.findOne({ name: migration.id });
};

const runMigrations = async (db = mongoose.connection.db) => {
  if (!db) {
    throw new Error("Connect to MongoDB before running migrations.");
  }
  const history = db.collection(HISTORY_COLLECTION);
  await history.createIndex({ name: 1 }, { unique: true, sparse: true });

  for (const migration of migrations) {
    const completedMigration =
      (await history.findOne({ name: migration.id })) || (await normalizeLegacyHistoryRecord(history, migration));

    if (completedMigration) {
      console.log(`${migration.id}: already applied; skipped.`);
      continue;
    }

    const startedAt = Date.now();
    console.log(`${migration.id}: applying...`);
    await migration.up(db);

    await history.insertOne({
      name: migration.id,
      description: migration.description,
      appliedAt: new Date(),
      executionMs: Date.now() - startedAt
    });

    console.log(`${migration.id}: applied successfully.`);
  }
};

const runFromCommandLine = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables.");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    await runMigrations();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  runFromCommandLine();
}

module.exports = { runMigrations };
