import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth";
import { runSeed } from "@/prisma/seed";
import { logAuditEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const { userId, role } = getUserContext(request);

    // Critical Security Invariant: Reset is strictly Admin-only
    if (role !== "Admin") {
      await logAuditEvent(
        "[TEST:AUTH_ISOLATION]",
        "UNAUTHORIZED_DATABASE_RESET_ATTEMPT",
        {
          attemptedByUserId: userId,
          attemptedRole: role,
        },
        "ERROR"
      );
      return NextResponse.json(
        { error: "Forbidden: Only administrators are authorized to reset the database." },
        { status: 403 }
      );
    }

    await runSeed();

    await logAuditEvent(
      "[TEST:SYSTEM_INIT]",
      "ADMIN_DATABASE_RESET_COMPLETED",
      {
        adminUserId: userId,
        status: "SUCCESS",
      },
      "SUCCESS"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Database successfully reset to baseline synthetic seed state (20 classes, 12 parents, 24 children, 6 teachers).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/test/reset:", error);
    return NextResponse.json(
      { error: "Failed to reset database." },
      { status: 500 }
    );
  }
}
