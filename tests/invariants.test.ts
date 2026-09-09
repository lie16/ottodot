import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";
import { POST as initiateBooking } from "@/app/api/bookings/initiate/route";
import { POST as confirmBooking } from "@/app/api/bookings/confirm/route";
import { GET as getRoster } from "@/app/api/roster/[classId]/route";
import { POST as resetDb } from "@/app/api/test/reset/route";

describe("Ottodot System Invariants Test Suite", () => {
  beforeAll(async () => {
    await runSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("1. Payment Failure Handling", () => {
    it("marks booking as PAYMENT_FAILED with HTTP 402 and leaves class capacity unchanged when card is declined", async () => {
      // Empty class: class_empty_01
      const classId = "class_empty_01";
      const studentId = "child_01_a"; // Alice (Parent 01)
      const parentId = "parent_01";

      const beforeClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
      const initialCount = beforeClass.confirmedCount;

      // Initiate
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

      // Confirm with pm_card_decline
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

      // Verify DB state
      const dbBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(dbBooking.status).toBe("PAYMENT_FAILED");

      const afterClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: classId } });
      expect(afterClass.confirmedCount).toBe(initialCount); // Seat was NOT consumed
    });
  });

  describe("2. Duplicate Booking Prevention", () => {
    it("rejects duplicate booking attempt for a child already confirmed in the class with HTTP 409", async () => {
      // In baseline seed, find an existing confirmed booking
      const existing = await prisma.booking.findFirstOrThrow({
        where: { status: "CONFIRMED" },
        include: { student: true },
      });

      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": existing.student.parentId,
          "x-user-role": "Parent",
        },
        body: JSON.stringify({
          classId: existing.classId,
          studentId: existing.studentId,
        }),
      });

      const res = await initiateBooking(initReq);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already has a confirmed booking");
    });
  });

  describe("3. Capacity Limit Pre-check", () => {
    it("rejects booking initiation on an already full class (confirmedCount >= 4) with HTTP 400", async () => {
      // class_full_01 is pre-seeded with 4 confirmed students
      const fullClassId = "class_full_01";
      const fullClass = await prisma.trialClass.findUniqueOrThrow({ where: { id: fullClassId } });
      expect(fullClass.confirmedCount).toBe(4);

      // Parent 05 tries to register child_05_a
      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_05",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({
          classId: fullClassId,
          studentId: "child_05_a",
        }),
      });

      const res = await initiateBooking(initReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Class is already full");
    });
  });

  describe("4. Parent-Child Ownership Boundary (Anti-Spoofing)", () => {
    it("prevents Parent A from booking for Parent B's child with HTTP 403", async () => {
      // parent_01 tries to book child_02_a (owned by parent_02)
      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_01",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({
          classId: "class_empty_02",
          studentId: "child_02_a",
        }),
      });

      const res = await initiateBooking(initReq);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("not authorized to book for another parent's child");
    });

    it("prevents Teachers or non-parents from initiating a booking with HTTP 403", async () => {
      const initReq = new Request("http://localhost/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "teacher_01",
          "x-user-role": "Teacher",
        },
        body: JSON.stringify({
          classId: "class_empty_02",
          studentId: "child_01_a",
        }),
      });

      const res = await initiateBooking(initReq);
      expect(res.status).toBe(403);
    });
  });

  describe("5. Role-Based Roster Isolation", () => {
    it("denies Parents from viewing any class student roster with HTTP 403", async () => {
      const req = new Request("http://localhost/api/roster/class_light_01", {
        method: "GET",
        headers: {
          "x-user-id": "parent_01",
          "x-user-role": "Parent",
        },
      });

      const res = await getRoster(req, { params: { classId: "class_light_01" } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Parents cannot access student rosters");
    });

    it("denies Teacher from accessing another teacher's class roster with HTTP 403", async () => {
      // class_light_01 is assigned to teacher_01 (Dr. Jonathan Tan)
      // teacher_02 (Sarah Lim) tries to view it
      const req = new Request("http://localhost/api/roster/class_light_01", {
        method: "GET",
        headers: {
          "x-user-id": "teacher_02",
          "x-user-role": "Teacher",
        },
      });

      const res = await getRoster(req, { params: { classId: "class_light_01" } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Teachers can only view their own class roster");
    });

    it("allows Teacher to view their OWN class roster with pedagogical info only (NO billing details)", async () => {
      const req = new Request("http://localhost/api/roster/class_light_01", {
        method: "GET",
        headers: {
          "x-user-id": "teacher_04",
          "x-user-role": "Teacher",
        },
      });

      const res = await getRoster(req, { params: { classId: "class_light_01" } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.students).toBeDefined();
      expect(data.students.length).toBeGreaterThan(0);
      // Ensure pedagogical data is present, but NO parent email or billing info
      const student = data.students[0];
      expect(student.name).toBeDefined();
      expect(student.age).toBeDefined();
      expect(student.parentEmail).toBeUndefined();
      expect(student.paymentRef).toBeUndefined();
    });

    it("allows Admin to view full operational roster including parent contacts and payment references", async () => {
      const req = new Request("http://localhost/api/roster/class_light_01", {
        method: "GET",
        headers: {
          "x-user-id": "admin_root",
          "x-user-role": "Admin",
        },
      });

      const res = await getRoster(req, { params: { classId: "class_light_01" } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.students).toBeDefined();
      expect(data.students.length).toBeGreaterThan(0);
      const student = data.students[0];
      expect(student.parentEmail).toBeDefined();
      expect(student.paymentRef).toBeDefined();
    });
  });

  describe("6. Admin-Only Database Reset Invariant", () => {
    it("rejects database reset attempts by Parents with HTTP 403", async () => {
      const req = new Request("http://localhost/api/test/reset", {
        method: "POST",
        headers: {
          "x-user-id": "parent_01",
          "x-user-role": "Parent",
        },
      });

      const res = await resetDb(req);
      expect(res.status).toBe(403);
    });

    it("rejects database reset attempts by Teachers with HTTP 403", async () => {
      const req = new Request("http://localhost/api/test/reset", {
        method: "POST",
        headers: {
          "x-user-id": "teacher_01",
          "x-user-role": "Teacher",
        },
      });

      const res = await resetDb(req);
      expect(res.status).toBe(403);
    });

    it("allows Admin to execute database reset and restores baseline synthetic data", async () => {
      const req = new Request("http://localhost/api/test/reset", {
        method: "POST",
        headers: {
          "x-user-id": "admin_root",
          "x-user-role": "Admin",
        },
      });

      const res = await resetDb(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const classCount = await prisma.trialClass.count();
      expect(classCount).toBe(20);
    });
  });
});
