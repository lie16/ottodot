import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";

describe("Concurrency Test Suite: Last-Seat Race Condition", () => {
  beforeAll(async () => {
    // Ensure clean baseline seed state
    await runSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ensures exactly ONE user secures seat #4 in a concurrent race, and the competitor receives 409 Conflict", async () => {
    // Target class: class_race_02 (Speed Calculation Arena - currently has 3 confirmed students)
    const targetClassId = "class_race_02";

    // 1. Verify baseline capacity is exactly 3/4
    const initialClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(initialClass.confirmedCount).toBe(3);
    expect(initialClass.maxCapacity).toBe(4);

    // 2. Initiate Booking for User A (Parent 06 / William)
    const reqA = new Request("http://localhost/api/bookings/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "parent_06",
        "x-user-role": "Parent",
      },
      body: JSON.stringify({ classId: targetClassId, studentId: "child_06_a" }),
    });
    const initResA = await initiateBooking(reqA);
    expect(initResA.status).toBe(201);
    const dataA = await initResA.json();

    // 3. Initiate Booking for User B (Parent 07 / Benjamin)
    const reqB = new Request("http://localhost/api/bookings/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "parent_07",
        "x-user-role": "Parent",
      },
      body: JSON.stringify({ classId: targetClassId, studentId: "child_07_a" }),
    });
    const initResB = await initiateBooking(reqB);
    expect(initResB.status).toBe(201);
    const dataB = await initResB.json();

    // 4. FIRE SIMULTANEOUS PAYMENT CONFIRMATIONS (The Concurrency Race!)
    const confirmReqA = new Request("http://localhost/api/bookings/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "parent_06",
        "x-user-role": "Parent",
      },
      body: JSON.stringify({
        bookingId: dataA.bookingId,
        paymentMethod: "pm_card_success",
      }),
    });

    const confirmReqB = new Request("http://localhost/api/bookings/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "parent_07",
        "x-user-role": "Parent",
      },
      body: JSON.stringify({
        bookingId: dataB.bookingId,
        paymentMethod: "pm_card_success",
      }),
    });

    // Execute concurrently using Promise.all
    const [resA, resB] = await Promise.all([
      confirmBooking(confirmReqA),
      confirmBooking(confirmReqB),
    ]);

    const statusA = resA.status;
    const statusB = resB.status;

    const bodyA = await resA.json();
    const bodyB = await resB.json();

    // 5. Assert that exactly ONE succeeded (200) and exactly ONE was rejected (409)
    const statuses = [statusA, statusB];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const winner = statusA === 200 ? bodyA : bodyB;
    const loser = statusA === 409 ? bodyA : bodyB;

    expect(winner.status).toBe("CONFIRMED");
    expect(winner.confirmedSeatNumber).toBe(4);
    expect(loser.status).toBe("REJECTED_CAPACITY_FULL");

    // 6. Direct Database Assertions: Invariant Integrity
    const finalClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(finalClass.confirmedCount).toBe(4);

    const totalConfirmedBookings = await prisma.booking.count({
      where: {
        classId: targetClassId,
        status: "CONFIRMED",
      },
    });
    expect(totalConfirmedBookings).toBe(4);
  });
});
