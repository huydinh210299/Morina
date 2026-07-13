require("dotenv").config();

const mongoose = require("mongoose");

const COLLECTIONS = ["users", "categories", "products", "accessories", "orders", "payments", "shifts"];
const AUDIT_COLLECTIONS = ["users", "categories", "products", "accessories", "orders", "payments", "shifts"];

const migrateAuditFields = async (db, userIdMap) => {
  for (const collectionName of AUDIT_COLLECTIONS) {
    const collection = db.collection(collectionName);

    for (const [uuid, objectId] of userIdMap) {
      await collection.updateMany({ createdBy: uuid }, { $set: { createdBy: objectId } });
      await collection.updateMany({ updatedBy: uuid }, { $set: { updatedBy: objectId } });
    }
  }
};

const dropIdIndexes = async (collection) => {
  const indexes = await collection.indexes();
  const idIndexes = indexes.filter((index) => {
    const keys = Object.keys(index.key || {});
    return keys.length === 1 && keys[0] === "id";
  });

  for (const index of idIndexes) {
    await collection.dropIndex(index.name);
  }

  return idIndexes.map((index) => index.name);
};

const removeUuidIds = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection("users").find({ id: { $exists: true } }, { projection: { _id: 1, id: 1 } }).toArray();
  const userIdMap = new Map(users.filter((user) => user.id).map((user) => [user.id, user._id.toString()]));

  await migrateAuditFields(db, userIdMap);

  for (const collectionName of COLLECTIONS) {
    const collection = db.collection(collectionName);
    const droppedIndexes = await dropIdIndexes(collection);
    const result = await collection.updateMany({ id: { $exists: true } }, { $unset: { id: "" } });

    console.log(
      `${collectionName}: removed id from ${result.modifiedCount} document(s); dropped indexes: ${
        droppedIndexes.join(", ") || "none"
      }.`
    );
  }
};

removeUuidIds()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Failed to remove UUID ids:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
