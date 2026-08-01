const up = async (db) => {
  const payments = db.collection("payments");
  const filter = {
    createdAt: { $type: "date" },
    $or: [{ paymentDate: { $exists: false } }, { paymentDate: null }]
  };
  const cursor = payments.find(filter, { projection: { _id: 1, createdAt: 1 } });
  const operations = [];
  let updatedCount = 0;

  for await (const payment of cursor) {
    operations.push({
      updateOne: {
        filter: { _id: payment._id },
        update: { $set: { paymentDate: payment.createdAt } }
      }
    });

    if (operations.length === 500) {
      const result = await payments.bulkWrite(operations);
      updatedCount += result.modifiedCount;
      operations.length = 0;
    }
  }

  if (operations.length) {
    const result = await payments.bulkWrite(operations);
    updatedCount += result.modifiedCount;
  }

  await payments.createIndex({ paymentDate: -1 });
  console.log(`payments: set paymentDate from createdAt for ${updatedCount} document(s).`);
};

module.exports = {
  id: "20260801-add-payment-date",
  description: "Add payment dates to finance payments using their creation dates",
  up
};
