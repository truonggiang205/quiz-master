export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export function createSuccessResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function createErrorResponse(message: string, error = 'BAD_REQUEST'): ApiResponse {
  return {
    success: false,
    message,
    error,
  };
}
