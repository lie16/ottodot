import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

  it("guarantees maximum 4 winners when 10 students concurrently book against one empty class (10 simultaneous -> 4 Confirmed, 6 Conflict)", async () => {
    // Target class: class_empty_03 (RoboPlay: First Lego Algorithms - initial 0/4 confirmed)
    const targetClassId = "class_empty_04";

    // 1. Verify class starts with 0/4 confirmed students
    const initialClass = await prisma.trialClass.findUniqueOrThrow({
      where: { id: targetClassId },
    });
    expect(initialClass.confirmedCount).toBe(0);
    expect(initialClass.maxCapacity).toBe(4);

    // 2. Define 10 distinct students across 10 distinct parents
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

    // 3. Initiate all 10 bookings (all succeed because class is initially empty)
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

    // 4. FIRE 10 SIMULTANEOUS PAYMENT CONFIRMATIONS (HIGH CONCURRENCY STAMPEDE!)
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

    // 5. Assert HTTP Statuses: EXACTLY 4 WINNERS (200 OK) AND EXACTLY 6 REJECTIONS (409 Conflict)
    const statuses = responses.map((r) => r.status);
    const successResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 409);

    expect(successResponses.length).toBe(4);
    expect(conflictResponses.length).toBe(6);
    expect(statuses.length).toBe(10);

    // Verify response bodies
    const winnersData = await Promise.all(successResponses.map((r) => r.json()));
    const losersData = await Promise.all(conflictResponses.map((r) => r.json()));

    const allocatedSeats = winnersData.map((w) => w.confirmedSeatNumber).sort((a, b) => a - b);
    expect(allocatedSeats).toEqual([1, 2, 3, 4]);

    for (const loser of losersData) {
      expect(loser.status).toBe("REJECTED_CAPACITY_FULL");
      expect(loser.error).toContain("Class Full");
    }

    // 6. Direct Database Engine Assertions
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

  it("prevents the same student from taking multiple seats when spamming 10 concurrent confirmation requests (Duplicate Booking Stampede)", async () => {
    // Target class: class_empty_05 (another empty class)
    const targetClassId = "class_empty_05";
    const studentId = "child_05_a";
    const parentId = "parent_05";

    // 1. Initiate 10 pending bookings for the exact same student and class
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

    // 2. Fire 10 simultaneous confirmations
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

    // 3. Exactly ONE should succeed, the other 9 should be rejected as duplicates
    const statuses = responses.map((r) => r.status);
    const successResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 409);

    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(9);

    // 4. Verify Database state: Only 1 confirmed seat for this student
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
