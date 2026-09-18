const IMAGE_PROXY_ORIGIN = (process.env.IMAGE_PROXY_ORIGIN || "https://media.morina.click").replace(/\/$/, "");
const GOOGLE_DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com"]);
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const IMAGE_SIZE_PATTERN = /^w[1-9]\d{1,3}$/;

const getGoogleDriveFileId = (sourceUrl) => {
  const idFromQuery = sourceUrl.searchParams.get("id");
  const idFromPath = sourceUrl.pathname.match(/\/d\/([^/]+)/)?.[1];

  return idFromQuery || idFromPath || "";
};

const getCachedImageUrl = (imageUrl = "") => {
  if (!imageUrl) return imageUrl;

  try {
    const sourceUrl = new URL(imageUrl);

    if (!GOOGLE_DRIVE_HOSTS.has(sourceUrl.hostname)) {
      return imageUrl;
    }

    const fileId = getGoogleDriveFileId(sourceUrl);
    if (!FILE_ID_PATTERN.test(fileId)) return imageUrl;

    const requestedSize = sourceUrl.searchParams.get("sz") || "w1000";
    const size = IMAGE_SIZE_PATTERN.test(requestedSize) ? requestedSize : "w1000";

    return `${IMAGE_PROXY_ORIGIN}/img/${fileId}?sz=${size}`;
  } catch {
    return imageUrl;
  }
};

module.exports = { getCachedImageUrl };
