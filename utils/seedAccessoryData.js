const fs = require("fs");
const path = require("path");
const Accessory = require("../models/Accessory");

const ACCESSORIES_CSV_PATH = path.join(__dirname, "..", "data", "accessories.csv");
const PRICE_MULTIPLIER = 1000;
const REQUIRED_HEADERS = ["Tên sản phẩm", "Giá", "Mã", "Link công khai"];

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && insideQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const getAccessoryImageUrl = (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    const isGoogleDrive = url.hostname === "drive.google.com" || url.hostname.endsWith(".drive.google.com");
    const fileId = url.searchParams.get("id") || url.pathname.match(/\/d\/([^/]+)/)?.[1];

    if (isGoogleDrive && fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
};

const getAccessoryRows = () => {
  if (!fs.existsSync(ACCESSORIES_CSV_PATH)) {
    throw new Error(`Không tìm thấy tệp dữ liệu phụ kiện: ${ACCESSORIES_CSV_PATH}`);
  }

  const lines = fs
    .readFileSync(ACCESSORIES_CSV_PATH, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const headers = parseCsvLine(lines.shift() || "").map((header) => header.trim());
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length) {
    throw new Error(`Tệp phụ kiện thiếu cột: ${missingHeaders.join(", ")}.`);
  }

  const seenCodes = new Set();

  return lines.map((line, index) => {
    const values = parseCsvLine(line);
    const row = headers.reduce((result, header, valueIndex) => {
      result[header] = values[valueIndex]?.trim() || "";
      return result;
    }, {});
    const code = row["Mã"];
    const name = row["Tên sản phẩm"];
    const priceInThousands = Number(row["Giá"]);

    if (!code || !name || !Number.isFinite(priceInThousands) || priceInThousands < 0) {
      throw new Error(`Dòng ${index + 2} trong tệp phụ kiện không hợp lệ.`);
    }

    if (seenCodes.has(code)) {
      throw new Error(`Mã phụ kiện ${code} bị trùng trong tệp dữ liệu.`);
    }

    seenCodes.add(code);
    return {
      code,
      name,
      price: priceInThousands * PRICE_MULTIPLIER,
      imageUrl: getAccessoryImageUrl(row["Link công khai"])
    };
  });
};

const seedAccessoryData = async (userId) => {
  const accessories = getAccessoryRows();

  const operations = accessories.map((accessory) => ({
    updateOne: {
      filter: { code: accessory.code },
      update: {
        $setOnInsert: {
          code: accessory.code,
          createdBy: userId
        },
        $set: {
          name: accessory.name,
          price: accessory.price,
          imageUrl: accessory.imageUrl,
          updatedBy: userId
        }
      },
      upsert: true
    }
  }));

  if (!operations.length) {
    return { created: 0, updated: 0 };
  }

  const result = await Accessory.bulkWrite(operations, { ordered: true });
  return {
    created: result.upsertedCount,
    updated: result.matchedCount
  };
};

module.exports = seedAccessoryData;
