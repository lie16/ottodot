import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";

describe("Payment Test Suite", () => {
  beforeAll(async () => {
    await runSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("handles successful payment and marks booking as CONFIRMED", async () => {
    const classId = "class_empty_01";
    const studentId = "child_01_a";
    const parentId = "parent_01";

    const beforeClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
    const initialCount = beforeClass.confirmedCount;

    const initReq = new Request("http://localhost/api/bookings/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": parentId,
        "x-user-role": "Parent",
      },
      body: JSON.stringify({ classId, studentId }),
    });
    const initRes = await initiateBooking(initReq);
    expect(initRes.status).toBe(201);
    const { bookingId } = await initRes.json();

    const confirmReq = new Request("http://localhost/api/bookings/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": parentId,
        "x-user-role": "Parent",
      },
      body: JSON.stringify({
        bookingId,
        paymentMethod: "pm_card_success",
      }),
    });
    const confirmRes = await confirmBooking(confirmReq);
    expect(confirmRes.status).toBe(200);
    const confirmData = await confirmRes.json();
    expect(confirmData.status).toBe("CONFIRMED");

    const dbBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(dbBooking.status).toBe("CONFIRMED");

    const afterClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
    expect(afterClass.confirmedCount).toBe(initialCount + 1);
  });

  it("marks booking as PAYMENT_FAILED with HTTP 402 and leaves class capacity unchanged when card is declined", async () => {
    const classId = "class_empty_02";
    const studentId = "child_02_a";
    const parentId = "parent_02";

    const beforeClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
    const initialCount = beforeClass.confirmedCount;

    const initReq = new Request("http://localhost/api/bookings/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": parentId,
        "x-user-role": "Parent",
      },
      body: JSON.stringify({ classId, studentId }),
    });
    const initRes = await initiateBooking(initReq);
    expect(initRes.status).toBe(201);
    const { bookingId } = await initRes.json();

    const confirmReq = new Request("http://localhost/api/bookings/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": parentId,
        "x-user-role": "Parent",
      },
      body: JSON.stringify({
        bookingId,
        paymentMethod: "pm_card_decline",
      }),
    });
    const confirmRes = await confirmBooking(confirmReq);
    expect(confirmRes.status).toBe(402);
    const confirmData = await confirmRes.json();
    expect(confirmData.status).toBe("PAYMENT_FAILED");

    const dbBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(dbBooking.status).toBe("PAYMENT_FAILED");

    const afterClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
    expect(afterClass.confirmedCount).toBe(initialCount);
  });
});
