import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter - formats all errors (HttpException and others) consistently.
 * Non-HttpException (e.g. Prisma) become 500 with a safe message so the client always gets { success, error }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse?.();
      const body =
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse };

      this.logger.warn(
        `${request.method} ${request.url} ${status}`,
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: unknown }).message
          : body,
      );

      const isStandardError =
        typeof body === 'object' &&
        body !== null &&
        'success' in body &&
        (body as { success?: boolean }).success === false &&
        'error' in body;

      if (isStandardError && typeof (body as { error?: unknown }).error === 'object') {
        response.status(status).json(body);
        return;
      }

      response.status(status).json({
        success: false,
        error: {
          message:
            typeof body === 'object' && body !== null && 'message' in body
              ? (body as { message: string }).message
              : String(exceptionResponse),
          code: 'ERROR',
        },
      });
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(`${request.method} ${request.url} ${status}`, exception instanceof Error ? exception.stack : message);
    response.status(status).json({
      success: false,
      error: {
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
        code: 'ERROR',
      },
    });
  }
}
