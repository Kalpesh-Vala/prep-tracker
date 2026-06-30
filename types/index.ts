/** Shared user shape exposed to the UI and server components. */
export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

/** Consistent success envelope returned by all API route handlers. */
export interface ApiSuccess<T> {
  data: T;
}

/** Consistent error envelope returned by all API route handlers. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
