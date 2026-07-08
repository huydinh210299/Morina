const setCreateAuditFields = (payload, user) => ({
  ...payload,
  createdBy: user.id,
  updatedBy: user.id
});

const setUpdateAuditFields = (payload, user) => ({
  ...payload,
  updatedBy: user.id
});

module.exports = {
  setCreateAuditFields,
  setUpdateAuditFields
};
