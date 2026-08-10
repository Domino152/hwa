import { AppError } from "./AppError";

export class ApiError extends AppError {
  public readonly errors: unknown[];

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: unknown[] = []
  ) {
    super(message, statusCode);
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
