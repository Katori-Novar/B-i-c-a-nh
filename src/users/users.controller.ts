import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import type { DecodedIdToken } from "firebase-admin/auth";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() firebaseUser: DecodedIdToken) {
    return this.usersService.syncFirebaseUser(firebaseUser);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(firebaseUser, updateProfileDto);
  }
}
