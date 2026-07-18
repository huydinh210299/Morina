const { getRedirectBackPath } = require("../utils/http");

const notFoundHandler = (req, res) => {
  res.status(404).render("pages/error", {
    title: "Không tìm thấy trang",
    message: "Không thể tìm thấy trang bạn yêu cầu."
  });
};

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error.code === 11000) {
    error.statusCode = 400;
    error.message = `Phát hiện giá trị trùng lặp cho ${Object.keys(error.keyPattern).join(", ")}.`;
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? "Đã xảy ra lỗi không mong muốn." : error.message || "Yêu cầu không hợp lệ.";
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
    title: "Đã xảy ra lỗi",
    message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
