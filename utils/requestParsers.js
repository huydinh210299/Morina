const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
};

const collapseCheckboxRowValues = (values, rowCount) => {
  const normalizedValues = toArray(values);

  if (!rowCount) {
    return normalizedValues;
  }

  const collapsed = [];
  let cursor = 0;

  for (let index = 0; index < rowCount; index += 1) {
    const currentValue = normalizedValues[cursor];
    const nextValue = normalizedValues[cursor + 1];
    const remainingRows = rowCount - index - 1;
    const remainingValuesAfterCurrent = normalizedValues.length - (cursor + 1);

    if (
      currentValue === "off" &&
      remainingValuesAfterCurrent > remainingRows &&
      nextValue !== undefined &&
      nextValue !== "off"
    ) {
      collapsed.push(nextValue);
      cursor += 2;
      continue;
    }

    collapsed.push(currentValue);
    cursor += 1;
  }

  return collapsed;
};

const parseRepeatingRows = (source, mapping) => {
  const keys = Object.keys(mapping);
  const rows = [];
  const normalized = {};

  for (const key of keys) {
    normalized[key] = toArray(source[key]);
  }

  const maxLength = Math.max(0, ...keys.map((key) => normalized[key].length));

  for (let index = 0; index < maxLength; index += 1) {
    const row = {};

    for (const key of keys) {
      row[mapping[key]] = normalized[key][index];
    }

    const hasValue = Object.values(row).some(
      (value) => value !== undefined && value !== null && `${value}`.trim() !== ""
    );

    if (hasValue) {
      rows.push(row);
    }
  }

  return rows;
};

const parseOrderItems = (source, config) => {
  const rowLengths = [
    toArray(source[config.idKey]).length,
    toArray(source[config.priceKey]).length,
    toArray(source[config.startKey]).length,
    toArray(source[config.endKey]).length
  ];

  if (config.amountKey) {
    rowLengths.push(toArray(source[config.amountKey]).length);
  }

  const rowCount = Math.max(...rowLengths);
  const mapping = {
    [config.idKey]: config.idField,
    [config.priceKey]: "price",
    [config.useGeneralKey]: "useGeneralTimes",
    [config.startKey]: "startTime",
    [config.endKey]: "endTime"
  };

  if (config.amountKey) {
    mapping[config.amountKey] = "amount";
  }

  return parseRepeatingRows(
    {
      ...source,
      [config.useGeneralKey]: collapseCheckboxRowValues(source[config.useGeneralKey], rowCount)
    },
    mapping
  );
};

const parseOrderPayload = (body) => {
  const products = parseOrderItems(body, {
    idKey: "productIds",
    idField: "product",
    priceKey: "productPrices",
    useGeneralKey: "productUseGeneralTimes",
    startKey: "productStartTimes",
    endKey: "productEndTimes"
  });

  const accessories = parseOrderItems(body, {
    idKey: "accessoryIds",
    idField: "accessory",
    priceKey: "accessoryPrices",
    amountKey: "accessoryAmounts",
    useGeneralKey: "accessoryUseGeneralTimes",
    startKey: "accessoryStartTimes",
    endKey: "accessoryEndTimes"
  });

  const payments = parseRepeatingRows(body, {
    paymentAmounts: "amount",
    paymentTypes: "type"
  });

  return {
    phone: body.phone,
    customerName: body.customerName,
    surcharge: body.surcharge,
    deposit: body.deposit,
    bookship: body.bookship,
    important: body.important,
    note: body.note,
    orderAmount: body.orderAmount,
    generalStartTime: body.generalStartTime,
    generalEndTime: body.generalEndTime,
    alreadyPickup: body.alreadyPickup,
    returned: body.returned,
    returnDeposit: body.returnDeposit,
    products,
    accessories,
    payments
  };
};

module.exports = {
  parseOrderPayload
};
