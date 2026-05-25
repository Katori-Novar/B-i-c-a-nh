import { Injectable } from "@nestjs/common";
import type { DecodedIdToken } from "firebase-admin/auth";
import { PrismaService } from "../database/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  syncFirebaseUser(firebaseUser: DecodedIdToken) {
    const email = this.readStringClaim(firebaseUser.email);
    const displayName = this.readStringClaim(firebaseUser.name);

    return this.prisma.user.upsert({
      where: {
        firebaseUid: firebaseUser.uid,
      },
      update: {
        email,
        displayName,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email,
        displayName,
      },
    });
  }

  updateProfile(firebaseUser: DecodedIdToken, dto: UpdateProfileDto) {
    const email = this.readStringClaim(firebaseUser.email);
    const displayName = this.readStringClaim(firebaseUser.name);

    return this.prisma.user.upsert({
      where: {
        firebaseUid: firebaseUser.uid,
      },
      update: {
        displayName: dto.displayName,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email,
        displayName: dto.displayName ?? displayName,
      },
    });
  }

  private readStringClaim(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
