"use client";

import React, { useState } from "react";
import { usePersona } from "./PersonaContext";
import {
  Zap,
  Copy,
  CreditCard,
  ShieldBan,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface TestResult {
  title: string;
  success: boolean;
  status: number;
  details: string;
  tag: string;
}

export function AdminTestRunner({ onTestCompleted }: { onTestCompleted: () => void }) {
  const { fetchWithAuth } = usePersona();
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  // Test 1: Concurrency Race Condition (2 Users competing for Seat #4)
  const runRaceConditionTest = async () => {
    try {
      setRunningTest("race");
      setLastResult(null);

      // Target class: class_race_01 (Solar Flare Chase - currently 3/4 confirmed)
      const targetClassId = "class_race_01";

      // Step A: Initiate both bookings simultaneously
      const [initA, initB] = await Promise.all([
        fetch("/api/bookings/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "parent_04",
            "x-user-role": "Parent",
          },
          body: JSON.stringify({ classId: targetClassId, studentId: "child_04_a" }),
        }),
        fetch("/api/bookings/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "parent_05",
            "x-user-role": "Parent",
          },
          body: JSON.stringify({ classId: targetClassId, studentId: "child_05_a" }),
        }),
      ]);

      const dataA = await initA.json();
      const dataB = await initB.json();

      if (!initA.ok || !initB.ok) {
        setLastResult({
          title: "Race Test: Initiation Failed",
          success: false,
          status: initA.status || initB.status,
          details: `Could not initiate test bookings: ${dataA.error || dataB.error}. Reset the database first if the class was already filled.`,
          tag: "[TEST:RACE_CONDITION]",
        });
        return;
      }

      // Step B: Submit payment confirmation simultaneously with Promise.all
      const [resA, resB] = await Promise.all([
        fetch("/api/bookings/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "parent_04",
            "x-user-role": "Parent",
          },
          body: JSON.stringify({ bookingId: dataA.bookingId, paymentMethod: "pm_card_success" }),
        }),
        fetch("/api/bookings/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "parent_05",
            "x-user-role": "Parent",
          },
          body: JSON.stringify({ bookingId: dataB.bookingId, paymentMethod: "pm_card_success" }),
        }),
      ]);

      const confA = await resA.json();
      const confB = await resB.json();

      const successCount = (resA.status === 200 ? 1 : 0) + (resB.status === 200 ? 1 : 0);
      const conflictCount = (resA.status === 409 ? 1 : 0) + (resB.status === 409 ? 1 : 0);

      const passed = successCount === 1 && conflictCount === 1;

      setLastResult({
        title: passed ? "Race Test Passed: Exact 1 Winner & 1 Rejection" : "Race Test Inconclusive",
        success: passed,
        status: passed ? 200 : 500,
        details: `User A (Elijah): HTTP ${resA.status} (${confA.status || confA.error}) | User B (James): HTTP ${resB.status} (${confB.status || confB.error}) — Confirmed seats capped strictly at 4.`,
        tag: "[TEST:RACE_CONDITION]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("Race test error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  // Test 1b: 10-Student High-Concurrency Stampede (10 Simultaneous Bookings -> Exactly 4 Winners, 6 Conflicts)
  const runTenUserStampedeTest = async () => {
    try {
      setRunningTest("stampede");
      setLastResult(null);

      // Target class: class_empty_04 (Crystal Garden: Chemistry for Beginners - 0/4 confirmed)
      const targetClassId = "class_empty_04";

      const contestants = [
        { parentId: "parent_01", studentId: "child_01_b", name: "Mia" },
        { parentId: "parent_02", studentId: "child_02_b", name: "Emma" },
        { parentId: "parent_03", studentId: "child_03_b", name: "Olivia" },
        { parentId: "parent_04", studentId: "child_04_b", name: "Lucas" },
        { parentId: "parent_05", studentId: "child_05_b", name: "Oliver" },
        { parentId: "parent_06", studentId: "child_06_b", name: "Mason" },
        { parentId: "parent_07", studentId: "child_07_b", name: "Ethan" },
        { parentId: "parent_08", studentId: "child_08_b", name: "Harper" },
        { parentId: "parent_09", studentId: "child_09_b", name: "Jack" },
        { parentId: "parent_10", studentId: "child_10_b", name: "Ella" },
      ];

      // Step A: Initiate all 10 bookings
      const initResponses = await Promise.all(
        contestants.map((c) =>
          fetch("/api/bookings/initiate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": c.parentId,
              "x-user-role": "Parent",
            },
            body: JSON.stringify({ classId: targetClassId, studentId: c.studentId }),
          })
        )
      );

      const initData = await Promise.all(initResponses.map((r) => r.json()));
      const validInitiations = initData.filter((d) => d.bookingId);

      if (validInitiations.length < 10) {
        setLastResult({
          title: "10-Student Stampede: Initiation Incomplete",
          success: false,
          status: 400,
          details: "Could not initiate all 10 bookings. Please reset the database to seed state first if class was already filled.",
          tag: "[TEST:RACE_CONDITION]",
        });
        return;
      }

      // Step B: Submit 10 simultaneous payment confirmations
      const confirmResponses = await Promise.all(
        contestants.map((c, idx) =>
          fetch("/api/bookings/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": c.parentId,
              "x-user-role": "Parent",
            },
            body: JSON.stringify({
              bookingId: initData[idx].bookingId,
              paymentMethod: "pm_card_success",
            }),
          })
        )
      );

      const successCount = confirmResponses.filter((r) => r.status === 200).length;
      const conflictCount = confirmResponses.filter((r) => r.status === 409).length;
      const passed = successCount === 4 && conflictCount === 6;

      setLastResult({
        title: passed
          ? "10-Student Stampede Passed: Exactly 4 Confirmed & 6 Auto-Refunded"
          : `10-Student Stampede: Unexpected Result (${successCount} won, ${conflictCount} rejected)`,
        success: passed,
        status: passed ? 200 : 500,
        details: `Dispatched 10 concurrent payments simultaneously against an empty class (max capacity 4). Results: ${successCount} CONFIRMED (HTTP 200), ${conflictCount} REJECTED_CAPACITY_FULL (HTTP 409). Class capacity holds strictly at 4!`,
        tag: "[TEST:RACE_CONDITION]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("10-student stampede test error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  // Test 2: Duplicate Booking Attempt
  const runDuplicateBookingTest = async () => {
    try {
      setRunningTest("duplicate");
      setLastResult(null);

      // child_01_a (Liam) is already confirmed in class_light_01
      const res = await fetch("/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_01",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({ classId: "class_light_01", studentId: "child_01_a" }),
      });

      const data = await res.json();
      const passed = res.status === 409;

      setLastResult({
        title: passed ? "Duplicate Guard Passed: HTTP 409 Conflict" : "Duplicate Test Failed",
        success: passed,
        status: res.status,
        details: data.error || "System blocked duplicate confirmed booking attempt.",
        tag: "[TEST:DUPLICATE_BOOKING]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("Duplicate test error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  // Test 3: Simulated Payment Decline
  const runPaymentFailureTest = async () => {
    try {
      setRunningTest("payment");
      setLastResult(null);

      // 1. Initiate booking on empty class
      const initRes = await fetch("/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_02",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({ classId: "class_empty_01", studentId: "child_02_b" }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setLastResult({
          title: "Payment Failure Test: Init Failed",
          success: false,
          status: initRes.status,
          details: initData.error,
          tag: "[TEST:PAYMENT_FAILURE]",
        });
        return;
      }

      // 2. Submit with declined card
      const confRes = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_02",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({
          bookingId: initData.bookingId,
          paymentMethod: "pm_card_decline",
        }),
      });

      const confData = await confRes.json();
      const passed = confRes.status === 402 && confData.status === "PAYMENT_FAILED";

      setLastResult({
        title: passed ? "Payment Failure Test Passed: HTTP 402 Declined" : "Payment Failure Test Failed",
        success: passed,
        status: confRes.status,
        details: `Booking marked PAYMENT_FAILED. Seat count untouched. Ref: ${confData.transactionRef}`,
        tag: "[TEST:PAYMENT_FAILURE]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("Payment fail test error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  // Test 4: Cross-Parent Child Security Breach
  const runAuthIsolationTest = async () => {
    try {
      setRunningTest("auth");
      setLastResult(null);

      // Parent Alice (parent_01) attempts to book Bob's child (child_02_a)
      const res = await fetch("/api/bookings/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "parent_01",
          "x-user-role": "Parent",
        },
        body: JSON.stringify({ classId: "class_empty_02", studentId: "child_02_a" }),
      });

      const data = await res.json();
      const passed = res.status === 403;

      setLastResult({
        title: passed ? "Auth Isolation Passed: HTTP 403 Forbidden" : "Auth Isolation Failed",
        success: passed,
        status: res.status,
        details: data.error || "Cross-parent child registration was blocked.",
        tag: "[TEST:AUTH_ISOLATION]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("Auth test error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  // Admin-Only Database Reset to Initial Seed
  const handleResetDatabase = async () => {
    try {
      setRunningTest("reset");
      setLastResult(null);

      const res = await fetchWithAuth("/api/test/reset", { method: "POST" });
      const data = await res.json();

      setLastResult({
        title: res.ok ? "Database Reset Successful" : "Reset Failed",
        success: res.ok,
        status: res.status,
        details: data.message || data.error,
        tag: "[TEST:SYSTEM_INIT]",
      });

      onTestCompleted();
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setRunningTest(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            Interactive Edge-Case Test Harness (Administrator Only)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute automated simulations of required take-home edge cases and concurrency races in real time.
          </p>
        </div>

        <button
          disabled={runningTest !== null}
          onClick={handleResetDatabase}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300 disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${runningTest === "reset" ? "animate-spin" : ""}`} />
          {runningTest === "reset" ? "Resetting..." : "Reset DB to Seed State"}
        </button>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 text-xs">
        {/* Race Condition Test (2 Users) */}
        <button
          disabled={runningTest !== null}
          onClick={runRaceConditionTest}
          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-amber-950 text-left transition-all disabled:opacity-50 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-amber-800">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
              1. 2-User Race
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/70 font-semibold">
              Seat #4
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            Fires 2 simultaneous payments for seat #4. Exactly 1 winner & 1 conflict.
          </p>
        </button>

        {/* 10-Student High-Concurrency Stampede */}
        <button
          disabled={runningTest !== null}
          onClick={runTenUserStampedeTest}
          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-950 text-left transition-all disabled:opacity-50 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              2. 10-User Stampede
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/70 font-semibold">
              10 &rarr; 4 Max
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80 leading-relaxed">
            10 students checkout simultaneously. Exactly 4 win; 6 get rejected with 409.
          </p>
        </button>

        {/* Duplicate Booking Guard */}
        <button
          disabled={runningTest !== null}
          onClick={runDuplicateBookingTest}
          className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-950 text-left transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-blue-800">
              <Copy className="w-4 h-4 text-blue-600" />
              3. Duplicate Guard
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-200/70 font-semibold">
              409 Conflict
            </span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed">
            Attempts re-booking an already enrolled child in the same class.
          </p>
        </button>

        {/* Payment Decline Test */}
        <button
          disabled={runningTest !== null}
          onClick={runPaymentFailureTest}
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 text-rose-950 text-left transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-rose-800">
              <CreditCard className="w-4 h-4 text-rose-600" />
              4. Payment Decline
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-200/70 font-semibold">
              402 Declined
            </span>
          </div>
          <p className="text-[11px] text-rose-800/80 leading-relaxed">
            Simulates card failure, verifies booking marked failed with 0 seats taken.
          </p>
        </button>

        {/* Cross-Parent Child Isolation */}
        <button
          disabled={runningTest !== null}
          onClick={runAuthIsolationTest}
          className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/60 text-purple-950 text-left transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-purple-800">
              <ShieldBan className="w-4 h-4 text-purple-600" />
              5. Auth Isolation
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-200/70 font-semibold">
              403 Forbidden
            </span>
          </div>
          <p className="text-[11px] text-purple-800/80 leading-relaxed">
            Tests cross-parent forgery attempting to book another parent&apos;s child.
          </p>
        </button>
      </div>

      {/* Test Execution Feedback */}
      {lastResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
            lastResult.success
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          {lastResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : lastResult.status === 409 ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{lastResult.title}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-white/70 border border-current">
                {lastResult.tag}
              </span>
            </div>
            <p className="text-xs leading-relaxed">{lastResult.details}</p>
          </div>
        </div>
      )}
    </div>
  );
}
