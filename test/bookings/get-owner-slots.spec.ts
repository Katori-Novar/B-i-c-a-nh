import { BadRequestException } from "@nestjs/common";
import { AvailabilityStatus, BookingStatus } from "@prisma/client";
import { createBookingsTestingModule, owner } from "./bookings.test-utils";

describe("BookingsService - customer views owner slots", () => {
  // Kiem tra tra ve cac slot con trong cua owner.
  it("returns available slots for an owner", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([
      {
        id: "availability-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
        slotDurationMin: 30,
        status: AvailabilityStatus.ACTIVE,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T11:00:00.000Z",
    });

    expect(result).toEqual([
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
      },
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:30:00.000Z"),
        endAt: new Date("2030-01-01T10:00:00.000Z"),
      },
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T10:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
      },
    ]);
  });

  // Kiem tra khong hien thi slot da co booking.
  it("does not show slots that are already booked", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([
      {
        id: "availability-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
        slotDurationMin: 30,
        status: AvailabilityStatus.ACTIVE,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: "booking-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:30:00.000Z"),
        endAt: new Date("2030-01-01T10:00:00.000Z"),
        status: BookingStatus.CONFIRMED,
      },
    ]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T10:30:00.000Z",
    });

    expect(result).toEqual([
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
      },
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T10:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
      },
    ]);
  });

  // Kiem tra khong hien thi cac khung lich ranh da bi huy.
  it("does not show cancelled availability windows", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T12:00:00.000Z",
    });

    expect(result).toEqual([]);
    expect(prisma.availabilityWindow.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
        status: AvailabilityStatus.ACTIVE,
        startAt: { lt: new Date("2030-01-01T12:00:00.000Z") },
        endAt: { gt: new Date("2030-01-01T09:00:00.000Z") },
      },
      orderBy: { startAt: "asc" },
    });
  });

  // Kiem tra neu truy van bat dau giua slot thi lay tu slot hop le tiep theo.
  it("starts at the next aligned slot when the query begins inside a slot", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([
      {
        id: "availability-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
        slotDurationMin: 30,
        status: AvailabilityStatus.ACTIVE,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:10:00.000Z",
      to: "2030-01-01T10:30:00.000Z",
    });

    expect(result).toEqual([
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:30:00.000Z"),
        endAt: new Date("2030-01-01T10:00:00.000Z"),
      },
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T10:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
      },
    ]);
  });

  // Kiem tra khong tra ve slot le neu slot do ket thuc sau khoang truy van.
  it("does not return partial slots that would end after the query range", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([
      {
        id: "availability-1",
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T10:30:00.000Z"),
        slotDurationMin: 30,
        status: AvailabilityStatus.ACTIVE,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T10:10:00.000Z",
    });

    expect(result).toEqual([
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
      },
      {
        ownerId: owner.id,
        startAt: new Date("2030-01-01T09:30:00.000Z"),
        endAt: new Date("2030-01-01T10:00:00.000Z"),
      },
    ]);
  });

  // Kiem tra chi dung booking da xac nhan de loai bo slot da dat.
  it("only checks confirmed bookings when removing booked slots", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T12:00:00.000Z",
    });

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: owner.id,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: new Date("2030-01-01T12:00:00.000Z") },
        endAt: { gt: new Date("2030-01-01T09:00:00.000Z") },
      },
    });
  });

  // Kiem tra tra ve danh sach rong khi owner khong co slot nao con trong.
  it("returns an empty list when the owner has no available slots", async () => {
    const { service, prisma } = await createBookingsTestingModule();
    prisma.availabilityWindow.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOwnerSlots(owner.id, {
      from: "2030-01-01T09:00:00.000Z",
      to: "2030-01-01T12:00:00.000Z",
    });

    expect(result).toEqual([]);
  });

  // Kiem tra tu choi truy van khi from sau to.
  it("rejects an invalid query range", async () => {
    const { service, prisma } = await createBookingsTestingModule();

    await expect(
      service.getOwnerSlots(owner.id, {
        from: "2030-01-01T12:00:00.000Z",
        to: "2030-01-01T09:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi truy van khi from khong phai ngay hop le.
  it("rejects an invalid query date", async () => {
    const { service, prisma } = await createBookingsTestingModule();

    await expect(
      service.getOwnerSlots(owner.id, {
        from: "not-a-date",
        to: "2030-01-01T09:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi truy van khi to khong phai ngay hop le.
  it("rejects an invalid query end date", async () => {
    const { service, prisma } = await createBookingsTestingModule();

    await expect(
      service.getOwnerSlots(owner.id, {
        from: "2030-01-01T09:00:00.000Z",
        to: "not-a-date",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  // Kiem tra tu choi truy van khi from bang to.
  it("rejects a query range where from equals to", async () => {
    const { service, prisma } = await createBookingsTestingModule();

    await expect(
      service.getOwnerSlots(owner.id, {
        from: "2030-01-01T09:00:00.000Z",
        to: "2030-01-01T09:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.availabilityWindow.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });
});
