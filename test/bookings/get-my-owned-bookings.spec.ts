import { BookingStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  customer,
  owner,
  ownerFirebaseUser,
} from "./bookings.test-utils";

describe("BookingsService - owner views owned bookings", () => {
  // Kiem tra tra ve cac booking thuoc owner hien tai theo thoi gian bat dau.
  it("returns bookings owned by the current owner ordered by start time", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const bookings = [
      {
        id: "booking-1",
        ownerId: owner.id,
        customerId: customer.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
        status: BookingStatus.CONFIRMED,
      },
    ];
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.booking.findMany.mockResolvedValue(bookings);

    const result = await service.getMyOwnedBookings(ownerFirebaseUser);

    expect(result).toBe(bookings);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  });

  // Kiem tra tra ve danh sach rong khi owner chua co booking nao.
  it("returns an empty list when the owner has no bookings", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(owner);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getMyOwnedBookings(ownerFirebaseUser);

    expect(result).toEqual([]);
  });
});
