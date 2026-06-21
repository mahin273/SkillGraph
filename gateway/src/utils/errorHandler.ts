import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: error.code ?? "INTERNAL_ERROR",
      message: statusCode === 500 ? "Unexpected server error" : error.message,
      statusCode
    }
  });
};
