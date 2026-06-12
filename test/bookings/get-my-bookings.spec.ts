import { BookingStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  customer,
  customerFirebaseUser,
  owner,
} from "./bookings.test-utils";

describe("BookingsService - customer views own bookings", () => {
  // Kiem tra tra ve cac booking cua customer hien tai.
  it("returns bookings for the current customer", async () => {
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
      {
        id: "booking-2",
        ownerId: owner.id,
        customerId: customer.id,
        startAt: new Date("2030-01-02T09:00:00.000Z"),
        endAt: new Date("2030-01-02T09:30:00.000Z"),
        status: BookingStatus.CANCELLED,
      },
    ];
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findMany.mockResolvedValue(bookings);

    const result = await service.getMyBookings(customerFirebaseUser);

    expect(result).toBe(bookings);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        startAt: "asc",
      },
    });
  });

  // Kiem tra tra ve danh sach rong khi customer chua co booking nao.
  it("returns an empty list when the customer has no bookings", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getMyBookings(customerFirebaseUser);

    expect(result).toEqual([]);
  });
});
