const up = async (db) => {
  const result = await db.collection("customers").updateMany(
    { hasFeedback: { $exists: false } },
    { $set: { hasFeedback: false } }
  );
  console.log(`customers: initialized feedback status for ${result.modifiedCount} customer(s).`);
};

module.exports = {
  id: "20261105-add-customer-feedback",
  description: "Default existing customers without a feedback status to false",
  up
};
