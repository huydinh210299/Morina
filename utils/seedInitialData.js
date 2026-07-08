require("dotenv").config();

const connectDB = require("../config/db");
const seedAdmin = require("./seedAdmin");
const seedSettings = require("./seedSettings");
const seedCatalogData = require("./seedCatalogData");

const seedInitialData = async () => {
  await connectDB();

  const admin = await seedAdmin();
  await seedSettings();
  await seedCatalogData(admin);

  console.log("Initial data seeded.");
};

seedInitialData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed initial data:", error);
    process.exit(1);
  });
