import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Concurrency Test Suite: Duplicate Stampede", () => {
  beforeAll(async () => {
    await runSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prevents the same student from taking multiple seats when spamming 10 concurrent confirmation requests (Duplicate Booking Stampede)", async () => {
    const targetClassId = "class_empty_01";
    const studentId = "child_05_a";
    const parentId = "parent_05";

    const initiatedBookings: string[] = [];
    for (let i = 0; i < 10; i++) {
      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": parentId,
          "x-user-role": "Parent",
        },
        body: JSON.stringify({ classId: targetClassId, studentId }),
      });
      const initRes = await initiateBooking(initReq);
      expect(initRes.status).toBe(201);
      const data = await initRes.json();
      initiatedBookings.push(data.bookingId);
    }

    expect(initiatedBookings.length).toBe(10);

    const confirmPromises = initiatedBookings.map((bookingId) =>
      confirmBooking(
        new Request("http://localhost/api/bookings/confirm", {
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
        })
      )
    );

    const responses = await Promise.all(confirmPromises);

    const statuses = responses.map((r) => r.status);
    const successResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 409);

    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(9);

    const updatedClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(updatedClass.confirmedCount).toBe(1);

    const dbConfirmedCount = await prisma.booking.count({
      where: {
        classId: targetClassId,
        studentId: studentId,
        status: "CONFIRMED",
      },
    });
    expect(dbConfirmedCount).toBe(1);
  });
});
