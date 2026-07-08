const { getRedirectBackPath } = require("../utils/http");

const notFoundHandler = (req, res) => {
  res.status(404).render("pages/error", {
    title: "KhÃ´ng tÃ¬m tháº¥y trang",
    message: "KhÃ´ng thá»ƒ tÃ¬m tháº¥y trang báº¡n yÃªu cáº§u."
  });
};

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error.code === 11000) {
    error.statusCode = 400;
    error.message = `PhÃ¡t hiá»‡n giÃ¡ trá»‹ trÃ¹ng láº·p cho ${Object.keys(error.keyPattern).join(", ")}.`;
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "ÄÃ£ xáº£y ra lá»—i khÃ´ng mong muá»‘n.";
  const acceptsHtml = req.accepts(["html", "json"]) === "html";
  const redirectBackPath = getRedirectBackPath(req);

  if (acceptsHtml && redirectBackPath && req.session) {
    req.session.error = message;
    if (req.method === "GET") {
      return res.redirect(redirectBackPath);
    }

    return res.redirect(303, redirectBackPath);
  }

  return res.status(statusCode).render("pages/error", {
    title: "ÄÃ£ xáº£y ra lá»—i",
    message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
