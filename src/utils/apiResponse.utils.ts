import { Response } from "express";

interface ApiSuccessResponse {
  response: true;
  message: string;
  data?: Record<string, unknown> | unknown[] | null;
  token?: string;
}

interface ApiErrorResponse {
  response: false;
  error: string;
  details?: unknown;
}

/**
 * Standardized success response
 */
export const ApiSuccess = (
  res: Response,
  message: string,
  statusCode: number = 200,
  data?: Record<string, unknown> | unknown[] | null,
  token?: string,
): void => {
  const response: ApiSuccessResponse = {
    response: true,
    message,
    ...(data !== undefined && { data }),
    ...(token && { token }),
  };
  res.status(statusCode).json(response);
};

/**
 * Standardized error response
 */
export const ApiError = (res: Response, error: string, statusCode: number = 500, details?: unknown): void => {
  const response: ApiErrorResponse = {
    response: false,
    error,
    ...(details !== undefined && { details }),
  };
  res.status(statusCode).json(response);
};

/**
 * Legacy support - redirects to ApiSuccess
 * @deprecated Use ApiSuccess instead
 */
export const ApiResponse = ApiSuccess;

/* Developer notes */
// Standard response format:
// response: { response: true, message: "...", data?: {...}, token?: "..." }
// Error: { response: false, error: "...", details?: {...} }
//
// This ensures frontend always knows if request succeeded by checking 'success' field
