const { URL } = require("url");

const getRedirectBackPath = (req) => {
  const referer = req.get("referer");

  if (!referer) {
    return null;
  }

  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const refererUrl = new URL(referer, baseUrl);
    const currentUrl = new URL(req.originalUrl, baseUrl);
    const refererPath = `${refererUrl.pathname}${refererUrl.search}`;
    const currentPath = `${currentUrl.pathname}${currentUrl.search}`;

    if (req.method === "GET" && refererPath === currentPath) {
      return null;
    }

    return refererPath;
  } catch (error) {
    return null;
  }
};

module.exports = {
  getRedirectBackPath
};
