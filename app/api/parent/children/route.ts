import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId, role } = getUserContext(request);

    if (role !== "Parent" || !userId) {
      return NextResponse.json(
        { error: "Forbidden: Only parents can query their registered children." },
        { status: 403 }
      );
    }

    const children = await prisma.student.findMany({
      where: { parentId: userId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(children);
  } catch (error) {
    console.error("Error in GET /api/parent/children:", error);
    return NextResponse.json(
      { error: "Failed to fetch parent children." },
      { status: 500 }
    );
  }
}
