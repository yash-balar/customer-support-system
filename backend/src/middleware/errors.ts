import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "Resource not found."));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Request validation failed.", details: error.flatten().fieldErrors });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  ) {
    res.status(400).json({ error: "Malformed JSON request body." });
    return;
  }
  if (error instanceof Error && error.name === "ValidationError") {
    res.status(400).json({ error: "Invalid request data." });
    return;
  }
  if (error instanceof Error && error.name === "CastError") {
    res.status(400).json({ error: "Invalid resource ID." });
    return;
  }
  if (error instanceof Error && "code" in error && error.code === 11000) {
    const duplicate = error as Error & { keyPattern?: Record<string, unknown> };
    if (duplicate.keyPattern?.organizationId && duplicate.keyPattern?.email) {
      res.status(409).json({
        error: "An invitation is already pending for this email in this organization."
      });
      return;
    }
    if (duplicate.keyPattern?.userId && duplicate.keyPattern?.organizationId) {
      res.status(409).json({
        error: "This user is already a member of this organization."
      });
      return;
    }
    res.status(409).json({ error: "This item already exists. Refresh and check before trying again." });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "An unexpected server error occurred." });
};
