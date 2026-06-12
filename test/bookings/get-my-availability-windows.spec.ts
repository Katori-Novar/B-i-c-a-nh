import { AvailabilityStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  owner,
  ownerFirebaseUser,
} from "./bookings.test-utils";

describe("BookingsService - owner views availability", () => {
  // Kiem tra tra ve danh sach lich ranh cua owner hien tai theo thoi gian bat dau.
  it("returns the current owner's availability windows ordered by start time", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const availabilityWindows = [
      {
        id: "availability-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T12:00:00.000Z"),
        slotDurationMin: 30,
        status: AvailabilityStatus.ACTIVE,
      },
    ];
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findMany.mockResolvedValue(availabilityWindows);

    const result = await service.getMyAvailabilityWindows(ownerFirebaseUser);

    expect(result).toBe(availabilityWindows);
    expect(prisma.availabilityWindow.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  });

  // Kiem tra tra ve danh sach rong khi owner chua co lich ranh.
  it("returns an empty list when the owner has no availability windows", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.availabilityWindow.findMany.mockResolvedValue([]);

    const result = await service.getMyAvailabilityWindows(ownerFirebaseUser);

    expect(result).toEqual([]);
  });
});
