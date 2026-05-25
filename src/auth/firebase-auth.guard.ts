import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";
import { FIREBASE_ADMIN } from "./firebase-admin.provider";

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseApp: App) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    try {
      request.user = await getAuth(this.firebaseApp).verifyIdToken(token);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid Firebase ID token");
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
