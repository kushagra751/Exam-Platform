export const notFound = (req, res, next) => {
  const error = new Error("Route not found");
  res.status(404);
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (error.name === "CastError" || error.name === "ValidationError") {
    statusCode = 400;
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(error);
  }

  res.status(statusCode).json({
    // Do not leak internal error details for unexpected server errors in production.
    message: isProduction && isServerError ? "Server error" : error.message || "Server error",
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined
  });
};
