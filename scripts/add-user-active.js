const up = async (db) => {
  const users = db.collection("users");
  const result = await users.updateMany(
    {
      $or: [{ active: { $exists: false } }, { active: null }]
    },
    {
      $set: { active: true }
    }
  );

  console.log(`users: enabled ${result.modifiedCount} existing user account(s) without an active status.`);
};

module.exports = {
  id: "20260808-add-user-active",
  description: "Enable existing user accounts that do not have an active status",
  up
};
