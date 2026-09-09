import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth";
import { logAuditEvent } from "@/lib/logger";

interface ConfirmRequest {
  bookingId: string;
  paymentMethod?: string; // 'pm_card_success' | 'pm_card_decline'
}

interface LockedClassRow {
  id: string;
  title: string;
  confirmed_count: number;
  max_capacity: number;
}

export async function POST(request: Request) {
  try {
    const { userId } = getUserContext(request);
    const body: ConfirmRequest = await request.json();
    const { bookingId, paymentMethod = "pm_card_success" } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Bad Request: bookingId is required." },
        { status: 400 }
      );
    }

    // 1. Fetch current booking record
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trialClass: true,
        student: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: `Booking cannot be confirmed. Current status: ${booking.status}` },
        { status: 400 }
      );
    }

    const classId = booking.classId;
    const studentName = booking.student.name;
    const classTitle = booking.trialClass.title;

    // 2. Scenario: Mock Payment Failure
    if (paymentMethod === "pm_card_decline") {
      const txnRef = `txn_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "PAYMENT_FAILED" },
        });

        await tx.paymentAttempt.create({
          data: {
            bookingId,
            amount: 35.0,
            currency: "SGD",
            status: "FAILED",
            paymentMethod,
            transactionRef: txnRef,
            failureReason: "Card declined: insufficient funds / card processor decline",
          },
        });
      });

      await logAuditEvent(
        "[TEST:PAYMENT_FAILURE]",
        "PAYMENT_DECLINED",
        {
          bookingId,
          studentName,
          classTitle,
          transactionRef: txnRef,
          seatAllocated: false,
          userParentId: userId,
        },
        "WARN"
      );

      return NextResponse.json(
        {
          error: "Payment Declined: The card was declined. Booking marked as payment_failed.",
          bookingId,
          status: "PAYMENT_FAILED",
          transactionRef: txnRef,
        },
        { status: 402 }
      );
    }

    // 3. Scenario: Mock Payment Success with Atomic PostgreSQL Row Lock (Flash-Sale Concurrency Resolution)
    const txnRef = `txn_succ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await prisma.$transaction(
      async (tx) => {
        // A. Acquire pessimistic exclusive lock on the target TrialClass row
        const lockedRows = await tx.$queryRaw<LockedClassRow[]>`
          SELECT id, title, confirmed_count, max_capacity
          FROM trial_classes
          WHERE id = ${classId}
          FOR UPDATE;
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new Error("CLASS_NOT_FOUND_IN_TRANSACTION");
        }

        const lockedClass = lockedRows[0];

        // B. Flash-Sale Concurrency Check: Was the last seat taken by a competitor?
        if (lockedClass.confirmed_count >= lockedClass.max_capacity) {
          // Competitor won seat #4 first -> Reject and auto-refund
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: "REJECTED_CAPACITY_FULL" },
          });

          await tx.paymentAttempt.create({
            data: {
              bookingId,
              amount: 35.0,
              currency: "SGD",
              status: "FAILED",
              paymentMethod,
              transactionRef: txnRef,
              failureReason: "Auto-refunded: Class reached max capacity of 4 students while processing payment",
            },
          });

          return {
            outcome: "REJECTED_CAPACITY_FULL" as const,
            confirmedCount: lockedClass.confirmed_count,
            maxCapacity: lockedClass.max_capacity,
          };
        }

        // C. Seat is available -> Atomically confirm booking and increment seat count
        const newConfirmedCount = lockedClass.confirmed_count + 1;

        await tx.trialClass.update({
          where: { id: classId },
          data: { confirmedCount: newConfirmedCount },
        });

        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
        });

        await tx.paymentAttempt.create({
          data: {
            bookingId,
            amount: 35.0,
            currency: "SGD",
            status: "SUCCESS",
            paymentMethod,
            transactionRef: txnRef,
          },
        });

        return {
          outcome: "CONFIRMED" as const,
          booking: updatedBooking,
          newConfirmedCount,
          maxCapacity: lockedClass.max_capacity,
        };
      },
      {
        isolationLevel: "ReadCommitted", // Standard PostgreSQL row-locking isolation
        timeout: 10000,
      }
    );

    // 4. Handle Transaction Results & Tagged Audit Logging
    if (result.outcome === "REJECTED_CAPACITY_FULL") {
      await logAuditEvent(
        "[TEST:RACE_CONDITION]",
        "SEAT_CONFLICT_LOST",
        {
          bookingId,
          classId,
          classTitle,
          studentName,
          userParentId: userId,
          reason: "User competed for last seat but another transaction committed first",
          confirmedCount: result.confirmedCount,
          maxCapacity: result.maxCapacity,
          refunded: true,
        },
        "WARN"
      );

      return NextResponse.json(
        {
          error: "Class Full: Another user completed payment for the last seat first. Your payment was not captured/refunded.",
          bookingId,
          status: "REJECTED_CAPACITY_FULL",
          transactionRef: txnRef,
        },
        { status: 409 }
      );
    }

    // Winner confirmed!
    await logAuditEvent(
      "[TEST:RACE_CONDITION]",
      "LOCK_ACQUIRED_AND_SEAT_CONFIRMED",
      {
        bookingId,
        classId,
        classTitle,
        studentName,
        userParentId: userId,
        seatSecured: result.newConfirmedCount,
        maxCapacity: result.maxCapacity,
        transactionRef: txnRef,
      },
      "SUCCESS"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Trial booking confirmed successfully!",
        bookingId,
        status: "CONFIRMED",
        confirmedSeatNumber: result.newConfirmedCount,
        maxCapacity: result.maxCapacity,
        transactionRef: txnRef,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/bookings/confirm:", error);
    return NextResponse.json(
      { error: "Internal server error during booking confirmation." },
      { status: 500 }
    );
  }
}
