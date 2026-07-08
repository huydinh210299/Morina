const Setting = require("../models/Setting");

const DEFAULT_SETTINGS = [
  {
    key: "hourSalary",
    value: "20000"
  },
  {
    key: "cashOnHand",
    value: "0"
  },
  {
    key: "commission",
    value: "3000"
  }
];

const seedSettings = async () => {
  for (const item of DEFAULT_SETTINGS) {
    await Setting.updateOne(
      { key: item.key },
      {
        $setOnInsert: {
          ...item,
          value: item.value
        }
      },
      { upsert: true }
    );
  }
};

module.exports = seedSettings;
