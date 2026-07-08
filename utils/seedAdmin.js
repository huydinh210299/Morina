const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { USER_ROLES } = require("./constants");

const seedAdmin = async () => {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "change_me_now";

  const existingAdmin = await User.findOne({ username: adminUsername });

  if (existingAdmin) {
    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await User.create({
    username: adminUsername,
    password: hashedPassword,
    role: USER_ROLES.ADMIN,
    createdBy: "system",
    updatedBy: "system"
  });

  console.log("Initial admin user seeded.");
  return admin;
};

module.exports = seedAdmin;
