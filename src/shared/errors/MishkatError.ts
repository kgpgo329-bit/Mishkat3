export type MishkatErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERSONAL_FATWA_DETECTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNGROUNDED_ANSWER'
  | 'ASSESSMENT_NOT_ELIGIBLE'
  | 'REPORT_NOT_ELIGIBLE'
  | 'REPORT_NOT_READY'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'AI_QUOTA_EXHAUSTED'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

export class MishkatError extends Error {
  public readonly code: MishkatErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: MishkatErrorCode,
    message: string,
    statusCode: number = 400,
    details?: unknown
  ) {
    super(message);
    this.name = 'MishkatError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, MishkatError.prototype);
  }

  static badRequest(message: string, details?: unknown): MishkatError {
    return new MishkatError('VALIDATION_ERROR', message, 400, details);
  }

  static notFound(message: string, details?: unknown): MishkatError {
    return new MishkatError('NOT_FOUND', message, 404, details);
  }

  static quotaExhausted(message: string = 'تم استنفاد حصة معالجة الذكاء الاصطناعي مؤقتاً'): MishkatError {
    return new MishkatError('AI_QUOTA_EXHAUSTED', message, 429);
  }

  static internal(message: string = 'حدث خطأ داخلي في الخادم', details?: unknown): MishkatError {
    return new MishkatError('INTERNAL_ERROR', message, 500, details);
  }
}
