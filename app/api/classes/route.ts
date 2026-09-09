import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId, role } = getUserContext(request);

    // Teacher Scoped View: Only return classes assigned to this teacher
    if (role === "Teacher" && userId) {
      const classes = await prisma.trialClass.findMany({
        where: { teacherId: userId },
        include: {
          teacher: true,
          _count: {
            select: {
              bookings: {
                where: { status: "CONFIRMED" },
              },
            },
          },
        },
        orderBy: { startTime: "asc" },
      });

      return NextResponse.json(classes);
    }

    // Admin & Parent: Return all scheduled classes
    const classes = await prisma.trialClass.findMany({
      include: {
        teacher: true,
        _count: {
          select: {
            bookings: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error in GET /api/classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial classes." },
      { status: 500 }
    );
  }
}
