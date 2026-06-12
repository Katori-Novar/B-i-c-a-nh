import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { AvailabilityStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  owner,
  ownerFirebaseUser,
} from "./bookings.test-utils";

describe("BookingsService - owner creates availability", () => {
  // Kiem tra owner tao duoc mot khung thoi gian ranh chua co booking.
  it("creates an empty availability window successfully", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const dto = {
      startAt: "2030-01-01T09:00:00.000Z",
      endAt: "2030-01-01T12:00:00.000Z",
      slotDurationMin: 30,
    };
    const createdWindow = {
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      slotDurationMin: dto.slotDurationMin,
      status: AvailabilityStatus.ACTIVE,
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    };
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue(null);
    prisma.availabilityWindow.create.mockResolvedValue(createdWindow);

    const result = await service.createAvailabilityWindow(ownerFirebaseUser, dto);

    expect(result).toBe(createdWindow);
    expect(prisma.availabilityWindow.findFirst).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
        status: AvailabilityStatus.ACTIVE,
        startAt: { lt: new Date(dto.endAt) },
        endAt: { gt: new Date(dto.startAt) },
      },
    });
    expect(prisma.availabilityWindow.create).toHaveBeenCalledWith({
      data: {
        ownerId: owner.id,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        slotDurationMin: dto.slotDurationMin,
      },
    });
  });

  // Kiem tra khong cho tao khung thoi gian bi trung voi khung da co.
  it("does not allow creating an overlapping availability window", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const dto = {
      startAt: "2030-01-01T09:00:00.000Z",
      endAt: "2030-01-01T12:00:00.000Z",
      slotDurationMin: 30,
    };
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue({
      id: "availability-existing",
      ownerId: owner.id,
    });

    await expect(
      service.createAvailabilityWindow(ownerFirebaseUser, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.availabilityWindow.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong cho tao khung thoi gian neu gio bat dau sau gio ket thuc.
  it("does not allow an invalid time range", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(owner);

    await expect(
      service.createAvailabilityWindow(ownerFirebaseUser, {
        startAt: "2030-01-01T12:00:00.000Z",
        endAt: "2030-01-01T09:00:00.000Z",
        slotDurationMin: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findFirst).not.toHaveBeenCalled();
    expect(prisma.availabilityWindow.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong cho tao khung thoi gian neu gia tri ngay khong hop le.
  it("does not allow an invalid date value", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(owner);

    await expect(
      service.createAvailabilityWindow(ownerFirebaseUser, {
        startAt: "not-a-date",
        endAt: "2030-01-01T09:00:00.000Z",
        slotDurationMin: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findFirst).not.toHaveBeenCalled();
    expect(prisma.availabilityWindow.create).not.toHaveBeenCalled();
  });

  // TODO: Kiem tra do dai slot sau khi chot quy tac chia lich.
  it.todo(
    "does not allow creating an availability window in the past after the exact boundary is confirmed",
  );

  // Kiem tra bat buoc phai co owner da xac thuc moi duoc tao lich ranh.
  it("requires an authenticated owner", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockRejectedValue(
      new UnauthorizedException("Authentication required"),
    );

    await expect(
      service.createAvailabilityWindow(ownerFirebaseUser, {
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T12:00:00.000Z",
        slotDurationMin: 30,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.availabilityWindow.create).not.toHaveBeenCalled();
  });
});
