const USER_ROLES = {
  ADMIN: "admin",
  STAFF: "staff"
};

const PAYMENT_TYPES = {
  BANK_TRANSFER: 0,
  CASH: 1
};

const PRODUCT_SIZES = Object.freeze([
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "36",
  "37",
  "38",
  "39",
  "40"
]);

module.exports = {
  USER_ROLES,
  PAYMENT_TYPES,
  PRODUCT_SIZES
};
