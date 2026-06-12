import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { DecodedIdToken } from "firebase-admin/auth";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { BookingsService } from "./bookings.service";
import { CreateAvailabilityWindowDto } from "./dto/create-availability-window.dto";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { GetOwnerSlotsDto } from "./dto/get-owner-slots.dto";

@Controller()
@UseGuards(FirebaseAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post("availability-windows")
  createAvailabilityWindow(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Body() dto: CreateAvailabilityWindowDto,
  ) {
    return this.bookingsService.createAvailabilityWindow(firebaseUser, dto);
  }

  @Get("availability-windows/me")
  getMyAvailabilityWindows(@CurrentUser() firebaseUser: DecodedIdToken) {
    return this.bookingsService.getMyAvailabilityWindows(firebaseUser);
  }

  @Patch("availability-windows/:id/cancel")
  cancelAvailabilityWindow(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Param("id") id: string,
  ) {
    return this.bookingsService.cancelAvailabilityWindow(firebaseUser, id);
  }

  @Get("owners/:ownerId/slots")
  getOwnerSlots(
    @Param("ownerId") ownerId: string,
    @Query() query: GetOwnerSlotsDto,
  ) {
    return this.bookingsService.getOwnerSlots(ownerId, query);
  }

  @Post("bookings")
  createBooking(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(firebaseUser, dto);
  }

  @Get("bookings/me")
  getMyBookings(@CurrentUser() firebaseUser: DecodedIdToken) {
    return this.bookingsService.getMyBookings(firebaseUser);
  }

  @Get("bookings/owned/me")
  getMyOwnedBookings(@CurrentUser() firebaseUser: DecodedIdToken) {
    return this.bookingsService.getMyOwnedBookings(firebaseUser);
  }

  @Patch("bookings/:id/cancel")
  cancelBooking(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Param("id") id: string,
  ) {
    return this.bookingsService.cancelBooking(firebaseUser, id);
  }
}
