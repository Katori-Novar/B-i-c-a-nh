import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AvailabilityStatus, BookingStatus } from "@prisma/client";
import type { DecodedIdToken } from "firebase-admin/auth";
import { PrismaService } from "../database/prisma.service";
import { UsersService } from "../users/users.service";
import { CreateAvailabilityWindowDto } from "./dto/create-availability-window.dto";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { GetOwnerSlotsDto } from "./dto/get-owner-slots.dto";

type Slot = {
  ownerId: string;
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createAvailabilityWindow(
    firebaseUser: DecodedIdToken,
    dto: CreateAvailabilityWindowDto,
  ) {
    const owner = await this.usersService.syncFirebaseUser(firebaseUser);
    const startAt = this.parseDate(dto.startAt, "startAt");
    const endAt = this.parseDate(dto.endAt, "endAt");
    this.assertDateRange(startAt, endAt);

    const overlappingWindow = await this.prisma.availabilityWindow.findFirst({
      where: {
        ownerId: owner.id,
        status: AvailabilityStatus.ACTIVE,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlappingWindow) {
      throw new ConflictException(
        "Availability window overlaps an existing window",
      );
    }

    return this.prisma.availabilityWindow.create({
      data: {
        ownerId: owner.id,
        startAt,
        endAt,
        slotDurationMin: dto.slotDurationMin,
      },
    });
  }

  async getMyAvailabilityWindows(firebaseUser: DecodedIdToken) {
    const owner = await this.usersService.syncFirebaseUser(firebaseUser);

    return this.prisma.availabilityWindow.findMany({
      where: {
        ownerId: owner.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  }

  async cancelAvailabilityWindow(firebaseUser: DecodedIdToken, id: string) {
    const owner = await this.usersService.syncFirebaseUser(firebaseUser);
    const availabilityWindow = await this.prisma.availabilityWindow.findUnique({
      where: { id },
    });

    if (!availabilityWindow) {
      throw new NotFoundException("Availability window not found");
    }

    if (availabilityWindow.ownerId !== owner.id) {
      throw new ForbiddenException(
        "You can only cancel your own availability windows",
      );
    }

    return this.prisma.availabilityWindow.update({
      where: { id },
      data: {
        status: AvailabilityStatus.CANCELLED,
      },
    });
  }

  async getOwnerSlots(ownerId: string, query: GetOwnerSlotsDto) {
    const from = this.parseDate(query.from, "from");
    const to = this.parseDate(query.to, "to");
    this.assertDateRange(from, to);

    const [availabilityWindows, bookings] = await Promise.all([
      this.prisma.availabilityWindow.findMany({
        where: {
          ownerId,
          status: AvailabilityStatus.ACTIVE,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        orderBy: {
          startAt: "asc",
        },
      }),
      this.prisma.booking.findMany({
        where: {
          ownerId,
          status: BookingStatus.CONFIRMED,
          startAt: { lt: to },
          endAt: { gt: from },
        },
      }),
    ]);

    const bookedSlots = bookings.map((booking) => ({
      startAt: booking.startAt.getTime(),
      endAt: booking.endAt.getTime(),
    }));

    return availabilityWindows
      .flatMap((availabilityWindow) =>
        this.buildSlots({
          ownerId,
          windowStartAt: availabilityWindow.startAt,
          windowEndAt: availabilityWindow.endAt,
          slotDurationMin: availabilityWindow.slotDurationMin,
          from,
          to,
        }),
      )
      .filter(
        (slot) =>
          !bookedSlots.some(
            (bookedSlot) =>
              slot.startAt.getTime() < bookedSlot.endAt &&
              slot.endAt.getTime() > bookedSlot.startAt,
          ),
      );
  }

  async createBooking(firebaseUser: DecodedIdToken, dto: CreateBookingDto) {
    const customer = await this.usersService.syncFirebaseUser(firebaseUser);
    const startAt = this.parseDate(dto.startAt, "startAt");
    const endAt = this.parseDate(dto.endAt, "endAt");
    this.assertDateRange(startAt, endAt);

    if (dto.ownerId === customer.id) {
      throw new BadRequestException("Owner cannot book their own slot");
    }

    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.findUnique({
        where: {
          id: dto.ownerId,
        },
      });

      if (!owner) {
        throw new NotFoundException("Owner not found");
      }

      const matchingWindow = await tx.availabilityWindow.findFirst({
        where: {
          ownerId: dto.ownerId,
          status: AvailabilityStatus.ACTIVE,
          startAt: { lte: startAt },
          endAt: { gte: endAt },
        },
      });

      if (!matchingWindow) {
        throw new BadRequestException(
          "Selected slot is outside owner's availability",
        );
      }

      const durationMs = endAt.getTime() - startAt.getTime();
      const expectedDurationMs = matchingWindow.slotDurationMin * 60 * 1000;

      if (durationMs !== expectedDurationMs) {
        throw new BadRequestException(
          "Selected slot duration does not match owner settings",
        );
      }

      const offsetMs = startAt.getTime() - matchingWindow.startAt.getTime();

      if (offsetMs % expectedDurationMs !== 0) {
        throw new BadRequestException(
          "Selected slot is not aligned with owner settings",
        );
      }

      const overlappingBooking = await tx.booking.findFirst({
        where: {
          ownerId: dto.ownerId,
          status: BookingStatus.CONFIRMED,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (overlappingBooking) {
        throw new ConflictException("Selected slot has already been booked");
      }

      return tx.booking.create({
        data: {
          ownerId: dto.ownerId,
          customerId: customer.id,
          startAt,
          endAt,
          note: dto.note,
        },
      });
    });
  }

  async getMyBookings(firebaseUser: DecodedIdToken) {
    const customer = await this.usersService.syncFirebaseUser(firebaseUser);

    return this.prisma.booking.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  }

  async getMyOwnedBookings(firebaseUser: DecodedIdToken) {
    const owner = await this.usersService.syncFirebaseUser(firebaseUser);

    return this.prisma.booking.findMany({
      where: {
        ownerId: owner.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  }

  async cancelBooking(firebaseUser: DecodedIdToken, id: string) {
    const customer = await this.usersService.syncFirebaseUser(firebaseUser);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.customerId !== customer.id && booking.ownerId !== customer.id) {
      throw new ForbiddenException(
        "You can only cancel bookings related to your account",
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });
  }

  private buildSlots(params: {
    ownerId: string;
    windowStartAt: Date;
    windowEndAt: Date;
    slotDurationMin: number;
    from: Date;
    to: Date;
  }): Slot[] {
    const slotDurationMs = params.slotDurationMin * 60 * 1000;
    const windowStartMs = params.windowStartAt.getTime();
    const fromOffsetMs = Math.max(0, params.from.getTime() - windowStartMs);
    const slotsToSkip = Math.ceil(fromOffsetMs / slotDurationMs);
    const firstSlotStartMs = windowStartMs + slotsToSkip * slotDurationMs;
    const slots: Slot[] = [];

    for (
      let slotStartMs = firstSlotStartMs;
      slotStartMs + slotDurationMs <= params.windowEndAt.getTime() &&
      slotStartMs + slotDurationMs <= params.to.getTime();
      slotStartMs += slotDurationMs
    ) {
      slots.push({
        ownerId: params.ownerId,
        startAt: new Date(slotStartMs),
        endAt: new Date(slotStartMs + slotDurationMs),
      });
    }

    return slots;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }

    return date;
  }

  private assertDateRange(startAt: Date, endAt: Date) {
    if (startAt >= endAt) {
      throw new BadRequestException("startAt must be before endAt");
    }
  }
}
