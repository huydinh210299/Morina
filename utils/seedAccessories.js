require("dotenv").config();

const connectDB = require("../config/db");
const seedAdmin = require("./seedAdmin");
const seedAccessoryData = require("./seedAccessoryData");

const seedAccessories = async () => {
  await connectDB();

  const admin = await seedAdmin();
  const result = await seedAccessoryData(admin._id.toString());
  console.log(`Đã tạo ${result.created} và cập nhật ${result.updated} phụ kiện.`);
};

seedAccessories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Không thể seed dữ liệu phụ kiện:", error);
    process.exit(1);
  });
