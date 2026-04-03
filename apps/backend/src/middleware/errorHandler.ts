import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.stack ?? err.message);
  const status = (err as any).status ?? 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : err.message,
  });
}
