import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";
import { logAuditEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const { userId, role } = getUserContext();

    if (role !== "Parent" || !userId) {
      await logAuditEvent(
        "[TEST:AUTH_ISOLATION]",
        "NON_PARENT_BOOKING_ATTEMPT",
        { userId, role },
        "WARN"
      );
      return NextResponse.json(
        { error: "Forbidden: Only parents can initiate trial bookings." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { classId, studentId } = body;

    if (!classId || !studentId) {
      return NextResponse.json(
        { error: "Bad Request: classId and studentId are required." },
        { status: 400 }
      );
    }

    // 1. Verify Student Ownership (Strict Parent-Child Boundary)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    if (student.parentId !== userId) {
      await logAuditEvent(
        "[TEST:AUTH_ISOLATION]",
        "CROSS_PARENT_REGISTRATION_BREACH",
        {
          attemptedByParent: userId,
          targetStudentId: studentId,
          actualParentId: student.parentId,
        },
        "ERROR"
      );
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to book for another parent's child." },
        { status: 403 }
      );
    }

    // 2. Verify Trial Class exists & pre-check capacity
    const trialClass = await prisma.trialClass.findUnique({
      where: { id: classId },
    });

    if (!trialClass) {
      return NextResponse.json({ error: "Trial class not found." }, { status: 404 });
    }

    if (trialClass.confirmedCount >= trialClass.maxCapacity) {
      await logAuditEvent(
        "[TEST:CAPACITY_LIMIT]",
        "BOOKING_ON_FULL_CLASS_BLOCKED",
        {
          classId,
          classTitle: trialClass.title,
          confirmedCount: trialClass.confirmedCount,
          maxCapacity: trialClass.maxCapacity,
        },
        "WARN"
      );
      return NextResponse.json(
        { error: "Class is already full (maximum 4 students)." },
        { status: 400 }
      );
    }

    // 3. Prevent Duplicate Confirmed Booking for Same Child & Class
    const existingConfirmedBooking = await prisma.booking.findFirst({
      where: {
        classId,
        studentId,
        status: "CONFIRMED",
      },
    });

    if (existingConfirmedBooking) {
      await logAuditEvent(
        "[TEST:DUPLICATE_BOOKING]",
        "DUPLICATE_BOOKING_REJECTED",
        {
          classId,
          classTitle: trialClass.title,
          studentId,
          studentName: student.name,
          existingBookingId: existingConfirmedBooking.id,
        },
        "WARN"
      );
      return NextResponse.json(
        { error: `Conflict: ${student.name} already has a confirmed booking for this class.` },
        { status: 409 }
      );
    }

    // 4. Create Booking in PENDING_PAYMENT state
    const booking = await prisma.booking.create({
      data: {
        classId,
        studentId,
        status: "PENDING_PAYMENT",
      },
      include: {
        trialClass: true,
        student: true,
      },
    });

    await logAuditEvent(
      "[TEST:SYSTEM_INIT]",
      "BOOKING_INITIATED",
      {
        bookingId: booking.id,
        classTitle: trialClass.title,
        studentName: student.name,
        parentUserId: userId,
        status: "PENDING_PAYMENT",
      },
      "INFO"
    );

    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        classId: booking.classId,
        classTitle: booking.trialClass.title,
        studentId: booking.studentId,
        studentName: booking.student.name,
        price: 35.0,
        currency: "SGD",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in /api/bookings/initiate:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while initiating booking." },
      { status: 500 }
    );
  }
}
