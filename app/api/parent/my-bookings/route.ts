import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId, role } = getUserContext(request);

    if (role !== "Parent" || !userId) {
      return NextResponse.json(
        { error: "Forbidden: Only parents can access their booking history." },
        { status: 403 }
      );
    }

    // Query all bookings for children belonging to this parent
    const bookings = await prisma.booking.findMany({
      where: {
        student: {
          parentId: userId,
        },
      },
      include: {
        trialClass: {
          include: {
            teacher: true,
          },
        },
        student: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error in GET /api/parent/my-bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch parent booking history." },
      { status: 500 }
    );
  }
}
