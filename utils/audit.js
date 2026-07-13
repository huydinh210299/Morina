const setCreateAuditFields = (payload, user) => ({
  ...payload,
  createdBy: user._id.toString(),
  updatedBy: user._id.toString()
});

const setUpdateAuditFields = (payload, user) => ({
  ...payload,
  updatedBy: user._id.toString()
});

module.exports = {
  setCreateAuditFields,
  setUpdateAuditFields
};
