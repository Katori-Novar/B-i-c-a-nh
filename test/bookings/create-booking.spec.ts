import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AvailabilityStatus, BookingStatus } from "@prisma/client";
import {
  createBookingsTestingModule,
  customer,
  customerFirebaseUser,
  owner,
} from "./bookings.test-utils";

describe("BookingsService - customer creates booking", () => {
  // Kiem tra customer tao booking thanh cong trong lich ranh cua owner.
  it("creates a booking successfully", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    const booking = {
      id: "booking-1",
      ownerId: owner.id,
      customerId: customer.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T09:30:00.000Z"),
      note: "Please prepare the room",
      status: BookingStatus.CONFIRMED,
    };
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue({
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T12:00:00.000Z"),
      slotDurationMin: 30,
      status: AvailabilityStatus.ACTIVE,
    });
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue(booking);

    const result = await service.createBooking(customerFirebaseUser, {
      ownerId: owner.id,
      startAt: "2030-01-01T09:00:00.000Z",
      endAt: "2030-01-01T09:30:00.000Z",
      note: "Please prepare the room",
    });

    expect(result).toBe(booking);
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        ownerId: owner.id,
        customerId: customer.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
        note: "Please prepare the room",
      },
    });
  });

  // Kiem tra customer khong duoc dat lich cua chinh minh.
  it("cannot book the customer's own slot", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: customer.id,
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong the dat lich voi owner khong ton tai.
  it("cannot book a missing owner", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong the dat lich ngoai khung thoi gian ranh cua owner.
  it("cannot book outside the owner's availability", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue(null);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T08:00:00.000Z",
        endAt: "2030-01-01T08:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findFirst).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
        status: AvailabilityStatus.ACTIVE,
        startAt: { lte: new Date("2030-01-01T08:00:00.000Z") },
        endAt: { gte: new Date("2030-01-01T08:30:00.000Z") },
      },
    });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong the dat lich neu do dai slot khong dung cau hinh cua owner.
  it("cannot book a slot with a duration that does not match owner settings", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue({
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T12:00:00.000Z"),
      slotDurationMin: 30,
      status: AvailabilityStatus.ACTIVE,
    });

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T09:45:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong the dat lich neu gio bat dau khong khop moc chia slot.
  it("cannot book a slot that is not aligned with owner settings", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue({
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T12:00:00.000Z"),
      slotDurationMin: 30,
      status: AvailabilityStatus.ACTIVE,
    });

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:15:00.000Z",
        endAt: "2030-01-01T09:45:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra khong the dat lich vao slot da co booking xac nhan.
  it("cannot book a slot that has already been booked", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.availabilityWindow.findFirst.mockResolvedValue({
      id: "availability-1",
      ownerId: owner.id,
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T12:00:00.000Z"),
      slotDurationMin: 30,
      status: AvailabilityStatus.ACTIVE,
    });
    prisma.booking.findFirst.mockResolvedValue({
      id: "booking-1",
      ownerId: owner.id,
      customerId: "customer-2",
      startAt: new Date("2030-01-01T09:00:00.000Z"),
      endAt: new Date("2030-01-01T09:30:00.000Z"),
      status: BookingStatus.CONFIRMED,
    });

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: new Date("2030-01-01T09:30:00.000Z") },
        endAt: { gt: new Date("2030-01-01T09:00:00.000Z") },
      },
    });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi booking khi ngay gio khong hop le.
  it("rejects an invalid booking date", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "not-a-date",
        endAt: "2030-01-01T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi booking khi gio bat dau sau gio ket thuc.
  it("rejects a booking range where startAt is after endAt", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:30:00.000Z",
        endAt: "2030-01-01T09:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi booking khi gio bat dau bang gio ket thuc.
  it("rejects a booking range where startAt equals endAt", async () => {
    const { service, prisma, usersService } = await createBookingsTestingModule();
    usersService.syncFirebaseUser.mockResolvedValue(customer);

    await expect(
      service.createBooking(customerFirebaseUser, {
        ownerId: owner.id,
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T09:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });
});
