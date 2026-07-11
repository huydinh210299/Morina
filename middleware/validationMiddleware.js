const validationOptions = require("../utils/validationOptions");

const validate = (schema, builder = (body) => body) => (req, res, next) => {
  const payload = builder(req.body);
  const { error, value } = schema.validate(payload, validationOptions);

  if (error) {
    req.session.error = error.details.map((detail) => detail.message).join(", ");
    return res.redirect("back");
  }

  req.validatedBody = value;
  return next();
};

module.exports = validate;
