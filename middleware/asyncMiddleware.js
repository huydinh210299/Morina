const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const wrapControllerHandlers = (handlers) =>
  Object.fromEntries(
    Object.entries(handlers).map(([key, handler]) => [
      key,
      typeof handler === "function" ? asyncHandler(handler) : handler
    ])
  );

module.exports = {
  asyncHandler,
  wrapControllerHandlers
};
