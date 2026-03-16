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
 * Global HTTP exception filter - formats error responses consistently.
 * Extend or replace when implementing business logic.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception.getResponse?.();

    const body =
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse };

    this.logger.warn(
      `${request.method} ${request.url} ${status}`,
      typeof body === 'object' && 'message' in body ? (body as { message: unknown }).message : body,
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
  }
}
