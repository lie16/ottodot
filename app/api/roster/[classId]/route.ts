import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";
import { logAuditEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const { userId, role } = getUserContext();
    const classId = params.classId;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const trialClass = await prisma.trialClass.findUnique({
      where: { id: classId },
      include: {
        teacher: true,
        bookings: {
          where: { status: "CONFIRMED" },
          include: {
            student: {
              include: {
                parent: true,
              },
            },
            paymentAttempts: {
              where: { status: "SUCCESS" },
              take: 1,
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!trialClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // 1. Role Enforcement: Parent cannot view class student rosters
    if (role === "Parent") {
      await logAuditEvent(
        "[TEST:AUTH_ISOLATION]",
        "PARENT_ROSTER_ACCESS_DENIED",
        { parentId: userId, classId },
        "WARN"
      );
      return NextResponse.json(
        { error: "Forbidden: Parents cannot access student rosters." },
        { status: 403 }
      );
    }

    // 2. Role Enforcement: Teacher can ONLY view their own class roster
    if (role === "Teacher") {
      if (trialClass.teacherId !== userId) {
        await logAuditEvent(
          "[TEST:AUTH_ISOLATION]",
          "TEACHER_CROSS_CLASS_ACCESS_DENIED",
          {
            attemptedTeacherId: userId,
            assignedTeacherId: trialClass.teacherId,
            classId,
          },
          "WARN"
        );
        return NextResponse.json(
          { error: "Forbidden: Teachers can only view their own class roster." },
          { status: 403 }
        );
      }

      // Teacher response: Pedagogical data ONLY (names, ages, booking time); NO billing info
      return NextResponse.json({
        classId: trialClass.id,
        title: trialClass.title,
        subject: trialClass.subject,
        startTime: trialClass.startTime,
        confirmedCount: trialClass.confirmedCount,
        maxCapacity: trialClass.maxCapacity,
        students: trialClass.bookings.map((b) => ({
          studentId: b.student.id,
          name: b.student.name,
          age: b.student.age,
          confirmedAt: b.updatedAt,
        })),
      });
    }

    // 3. Admin: Full operational roster with parent and payment reference info
    return NextResponse.json({
      classId: trialClass.id,
      title: trialClass.title,
      subject: trialClass.subject,
      teacher: {
        id: trialClass.teacher.id,
        name: trialClass.teacher.name,
        email: trialClass.teacher.email,
      },
      startTime: trialClass.startTime,
      confirmedCount: trialClass.confirmedCount,
      maxCapacity: trialClass.maxCapacity,
      students: trialClass.bookings.map((b) => ({
        bookingId: b.id,
        studentId: b.student.id,
        name: b.student.name,
        age: b.student.age,
        parentName: b.student.parent.name,
        parentEmail: b.student.parent.email,
        confirmedAt: b.updatedAt,
        paymentRef: b.paymentAttempts[0]?.transactionRef || "N/A",
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/roster/[classId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch class roster." },
      { status: 500 }
    );
  }
}
