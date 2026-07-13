require("dotenv").config();

const mongoose = require("mongoose");

const migrations = [require("./remove-uuid-ids")];
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

const runMigrations = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;
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

runMigrations()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Migration failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
