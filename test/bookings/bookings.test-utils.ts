import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { DecodedIdToken } from "firebase-admin/auth";
import { PrismaService } from "../../src/database/prisma.service";
import { UsersService } from "../../src/users/users.service";
import { BookingsService } from "../../src/bookings/bookings.service";

export const owner = {
  id: "owner-1",
  firebaseUid: "firebase-owner-1",
  email: "owner@example.com",
  displayName: "Owner",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const otherOwner = {
  ...owner,
  id: "owner-2",
  firebaseUid: "firebase-owner-2",
  email: "owner-2@example.com",
};

export const customer = {
  id: "customer-1",
  firebaseUid: "firebase-customer-1",
  email: "customer@example.com",
  displayName: "Customer",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const ownerFirebaseUser = {
  uid: owner.firebaseUid,
  email: owner.email,
  name: owner.displayName,
} as unknown as DecodedIdToken;

export const customerFirebaseUser = {
  uid: customer.firebaseUid,
  email: customer.email,
  name: customer.displayName,
} as unknown as DecodedIdToken;

export type PrismaMock = ReturnType<typeof createPrismaMock>;
export type UsersServiceMock = ReturnType<typeof createUsersServiceMock>;

export function createPrismaMock() {
  const prisma = {
    availabilityWindow: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  );

  return prisma;
}

export function createUsersServiceMock() {
  return {
    syncFirebaseUser: jest.fn(),
  };
}

export async function createBookingsTestingModule(): Promise<{
  module: TestingModule;
  service: BookingsService;
  prisma: PrismaMock;
  usersService: UsersServiceMock;
}> {
  const prisma = createPrismaMock();
  const usersService = createUsersServiceMock();
  const module = await Test.createTestingModule({
    providers: [
      BookingsService,
      {
        provide: PrismaService,
        useValue: prisma,
      },
      {
        provide: UsersService,
        useValue: usersService,
      },
    ],
  }).compile();

  return {
    module,
    service: module.get(BookingsService),
    prisma,
    usersService,
  };
}
