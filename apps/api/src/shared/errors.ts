import type { ApiErrorDetail } from '@shop/shared';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'INVALID_STATE_TRANSITION'
  | 'RATE_LIMITED'
  | 'PAYMENT_FAILED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validation(message = 'Geçersiz istek', details?: ApiErrorDetail[]) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Oturum açmanız gerekiyor') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Bu işlem için yetkiniz yok') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Kayıt bulunamadı') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Çakışma oluştu') {
    return new AppError(409, 'CONFLICT', message);
  }
  static outOfStock(message = 'Yeterli stok yok', details?: ApiErrorDetail[]) {
    return new AppError(409, 'OUT_OF_STOCK', message, details);
  }
  static invalidTransition(message = 'Geçersiz durum geçişi') {
    return new AppError(409, 'INVALID_STATE_TRANSITION', message);
  }
  static paymentFailed(message = 'Ödeme başarısız oldu') {
    return new AppError(402, 'PAYMENT_FAILED', message);
  }
}
