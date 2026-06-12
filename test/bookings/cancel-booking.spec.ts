import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  customer,
  customerFirebaseUser,
  owner,
} from "./bookings.test-utils";

describe("BookingsService - customer cancels booking", () => {
  // Kiem tra customer huy booking cua minh thanh cong.
  it("cancels a booking successfully", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const booking = {
      id: "booking-1",
      ownerId: owner.id,
      customerId: customer.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T09:30:00.000Z"),
      status: BookingStatus.CONFIRMED,
    };
    const cancelledBooking = {
      ...booking,
      status: BookingStatus.CANCELLED,
    };
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(cancelledBooking);

    const result = await service.cancelBooking(customerFirebaseUser, booking.id);

    expect(result).toBe(cancelledBooking);
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });
  });

  // Kiem tra khong the huy booking khong ton tai.
  it("cannot cancel a missing booking", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.cancelBooking(customerFirebaseUser, "missing-booking"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  // Kiem tra customer khong duoc huy booking cua customer khac.
  it("cannot cancel another customer's booking", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      ownerId: owner.id,
      customerId: "customer-2",
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T09:30:00.000Z"),
      status: BookingStatus.CONFIRMED,
    });

    await expect(
      service.cancelBooking(customerFirebaseUser, "booking-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  // Kiem tra viec huy lai booking da bi huy van tra ve ket qua hop le.
  it("can cancel a booking that is already cancelled", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const booking = {
      id: "booking-1",
      ownerId: owner.id,
      customerId: customer.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T09:30:00.000Z"),
      status: BookingStatus.CANCELLED,
    };
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(booking);

    const result = await service.cancelBooking(customerFirebaseUser, booking.id);

    expect(result).toBe(booking);
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });
  });

  // TODO: Kiem tra owner khong dung duoc luong huy booking cua customer neu can tach rieng.
  it.todo(
    "does not let the owner use the customer cancellation flow if owner cancellation must be separated",
  );

  // TODO: Kiem tra khong duoc huy booking khi da qua thoi han cho phep.
  it.todo(
    "cannot cancel when the allowed cancellation window has passed after the deadline policy is confirmed",
  );
});
