export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentification requise") {
    return new AppError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Acces refuse") {
    return new AppError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Ressource introuvable") {
    return new AppError(404, "NOT_FOUND", message);
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, "CONFLICT", message, details);
  }
  static insufficientFunds(message = "Solde KANIO insuffisant") {
    return new AppError(422, "INSUFFICIENT_FUNDS", message);
  }
}
