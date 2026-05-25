import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Request } from "express";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DecodedIdToken | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
