import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AvailabilityStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  otherOwner,
  owner,
  ownerFirebaseUser,
} from "./bookings.test-utils";

describe("BookingsService - owner cancels availability", () => {
  // Kiem tra owner huy duoc khung thoi gian ranh chua co booking.
  it("cancels an empty availability window successfully", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const availabilityWindow = {
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T12:00:00.000Z"),
      slotDurationMin: 30,
      status: AvailabilityStatus.ACTIVE,
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    };
    const cancelledWindow = {
      ...availabilityWindow,
      status: AvailabilityStatus.CANCELLED,
    };
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findUnique.mockResolvedValue(availabilityWindow);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.availabilityWindow.update.mockResolvedValue(cancelledWindow);

    const result = await service.cancelAvailabilityWindow(
      ownerFirebaseUser,
      availabilityWindow.id,
    );

    expect(result).toBe(cancelledWindow);
    expect(prisma.availabilityWindow.update).toHaveBeenCalledWith({
      where: { id: availabilityWindow.id },
      data: { status: AvailabilityStatus.CANCELLED },
    });
  });

  // Kiem tra khong the huy khung thoi gian ranh khong ton tai.
  it("cannot cancel a missing availability window", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findUnique.mockResolvedValue(null);

    await expect(
      service.cancelAvailabilityWindow(ownerFirebaseUser, "missing-window"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.availabilityWindow.update).not.toHaveBeenCalled();
  });

  // TODO: Kiem tra cach xu ly khi huy khung thoi gian da co booking.
  it.todo(
    "cannot cancel an availability window that already has a confirmed booking after the service enforces this rule",
  );

  // Kiem tra owner khac khong duoc huy khung thoi gian cua owner hien tai.
  it("does not allow another owner to cancel the window", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(otherOwner);
    prisma.availabilityWindow.findUnique.mockResolvedValue({
      id: "availability-1",
      ownerId: owner.id,
    });

    await expect(
      service.cancelAvailabilityWindow(ownerFirebaseUser, "availability-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.availabilityWindow.update).not.toHaveBeenCalled();
  });
});
