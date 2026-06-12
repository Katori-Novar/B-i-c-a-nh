import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

type RequestWithContext = Request & {
  requestId?: string;
};

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const requestId = request.header("x-request-id") ?? randomUUID();
    const startedAt = Date.now();

    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    response.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms requestId=${requestId}`,
      );
    });

    next();
  }
}
