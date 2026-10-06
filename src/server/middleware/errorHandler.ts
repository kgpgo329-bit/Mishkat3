import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MishkatError } from '../../shared/errors/MishkatError.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof MishkatError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'خطأ في التحقق من صحة البيانات المدخلة',
        details: err.errors,
      },
    });
    return;
  }

  console.error('[Mishkat Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ داخلي في الخادم',
    },
  });
}
