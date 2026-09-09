import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Concurrency Test Suite: 10-Student Stampede", () => {
  beforeAll(async () => {
    await runSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("guarantees maximum 4 winners when 10 students concurrently book against one empty class (10 simultaneous -> 4 Confirmed, 6 Conflict)", async () => {
    const targetClassId = "class_empty_04";

    const initialClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(initialClass.confirmedCount).toBe(0);
    expect(initialClass.maxCapacity).toBe(4);

    const contestants = [
      { parentId: "parent_01", studentId: "child_01_b", studentName: "Olivia" },
      { parentId: "parent_02", studentId: "child_02_b", studentName: "Emma" },
      { parentId: "parent_03", studentId: "child_03_b", studentName: "Charlotte" },
      { parentId: "parent_04", studentId: "child_04_b", studentName: "Amelia" },
      { parentId: "parent_05", studentId: "child_05_b", studentName: "Sophia" },
      { parentId: "parent_06", studentId: "child_06_b", studentName: "Isabella" },
      { parentId: "parent_07", studentId: "child_07_b", studentName: "Mia" },
      { parentId: "parent_08", studentId: "child_08_b", studentName: "Evelyn" },
      { parentId: "parent_09", studentId: "child_09_b", studentName: "Harper" },
      { parentId: "parent_10", studentId: "child_10_b", studentName: "Camila" },
    ];

    const initiatedBookings: { bookingId: string; parentId: string }[] = [];
    for (const c of contestants) {
      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": c.parentId,
          "x-user-role": "Parent",
        },
        body: JSON.stringify({ classId: targetClassId, studentId: c.studentId }),
      });
      const initRes = await initiateBooking(initReq);
      expect(initRes.status).toBe(201);
      const data = await initRes.json();
      initiatedBookings.push({ bookingId: data.bookingId, parentId: c.parentId });
    }

    expect(initiatedBookings.length).toBe(10);

    const confirmPromises = initiatedBookings.map((b) =>
      confirmBooking(
        new Request("http://localhost/api/bookings/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": b.parentId,
            "x-user-role": "Parent",
          },
          body: JSON.stringify({
            bookingId: b.bookingId,
            paymentMethod: "pm_card_success",
          }),
        })
      )
    );

    const responses = await Promise.all(confirmPromises);

    const statuses = responses.map((r) => r.status);
    const successResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 409);

    expect(successResponses.length).toBe(4);
    expect(conflictResponses.length).toBe(6);
    expect(statuses.length).toBe(10);

    const winnersData = await Promise.all(successResponses.map((r) => r.json()));
    const losersData = await Promise.all(conflictResponses.map((r) => r.json()));

    const allocatedSeats = winnersData.map((w) => w.confirmedSeatNumber).sort((a, b) => a - b);
    expect(allocatedSeats).toEqual([1, 2, 3, 4]);

    for (const loser of losersData) {
      expect(loser.status).toBe("REJECTED_CAPACITY_FULL");
      expect(loser.error).toContain("Class Full");
    }

    const updatedClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(updatedClass.confirmedCount).toBe(4);

    const dbConfirmedCount = await prisma.booking.count({
      where: {
        classId: targetClassId,
        status: "CONFIRMED",
      },
    });
    expect(dbConfirmedCount).toBe(4);

    const dbRejectedCount = await prisma.booking.count({
      where: {
        classId: targetClassId,
        status: "REJECTED_CAPACITY_FULL",
      },
    });
    expect(dbRejectedCount).toBe(6);
  });
});
