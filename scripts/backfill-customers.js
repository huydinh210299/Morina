const up = async (db) => {
  const customers = db.collection("customers");
  await customers.createIndex({ phone: 1 }, { unique: true });

  const groups = db.collection("orders").aggregate([
    { $match: { phone: { $type: "string" } } },
    { $set: { customerPhone: { $trim: { input: "$phone" } } } },
    { $match: { customerPhone: { $ne: "" } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: {
      _id: "$customerPhone",
      name: { $first: "$customerName" },
      totalOrder: { $sum: 1 }
    } }
  ], { allowDiskUse: true });

  let operations = [];
  let customerCount = 0;
  let orderCount = 0;
  for await (const group of groups) {
    const now = new Date();
    const name = typeof group.name === "string" && group.name.trim() ? group.name.trim() : "Khách hàng";
    operations.push({ updateOne: {
      filter: { phone: group._id },
      // Absolute totals make retrying after a partial failure safe.
      update: { $set: { name, totalOrder: group.totalOrder, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    } });
    customerCount += 1;
    orderCount += group.totalOrder;
    if (operations.length === 500) {
      await customers.bulkWrite(operations);
      operations = [];
    }
  }
  if (operations.length) await customers.bulkWrite(operations);
  const skipped = await db.collection("orders").countDocuments({}) - orderCount;
  console.log(`customers: migrated ${customerCount} customer(s) from ${orderCount} order(s); skipped ${skipped} order(s) without a usable phone.`);
};

module.exports = {
  id: "20261023-backfill-customers",
  description: "Create customer records and order counts from existing orders grouped by trimmed phone",
  up
};
