"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersona } from "./PersonaContext";
import {
  Users,
  Calendar,
  Sparkles,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
} from "lucide-react";

interface Child {
  id: string;
  name: string;
  age: number;
}

interface ParentClassItem {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  maxCapacity: number;
  confirmedCount: number;
  teacher: {
    id: string;
    name: string;
    specialty: string;
  };
}

interface ParentBookingRecord {
  id: string;
  status: string;
  createdAt: string;
  trialClass: {
    id: string;
    title: string;
    subject: string;
    startTime: string;
    teacher: { name: string };
  };
  student: {
    id: string;
    name: string;
  };
  paymentAttempts: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    transactionRef: string;
    failureReason?: string;
  }[];
}

export function ParentPortal({ onBookingAction }: { onBookingAction?: () => void }) {
  const { currentUser, fetchWithAuth } = usePersona();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [classes, setClasses] = useState<ParentClassItem[]>([]);
  const [history, setHistory] = useState<ParentBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout Modal State
  const [selectedClass, setSelectedClass] = useState<ParentClassItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pm_card_success" | "pm_card_decline">("pm_card_success");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState<{
    type: "success" | "error" | "conflict";
    message: string;
    details?: string;
  } | null>(null);

  const loadParentData = useCallback(async () => {
    try {
      setLoading(true);
      const [childrenRes, classesRes, historyRes] = await Promise.all([
        fetchWithAuth("/api/parent/children"),
        fetchWithAuth("/api/classes"),
        fetchWithAuth("/api/parent/my-bookings"),
      ]);

      if (childrenRes.ok) {
        const cData: Child[] = await childrenRes.json();
        setChildren(cData);
        if (cData.length > 0 && !selectedChildId) {
          setSelectedChildId(cData[0].id);
        }
      }

      if (classesRes.ok) {
        const clData: ParentClassItem[] = await classesRes.json();
        setClasses(clData);
      }

      if (historyRes.ok) {
        const hData: ParentBookingRecord[] = await historyRes.json();
        setHistory(hData);
      }
    } catch (err) {
      console.error("Failed to load parent portal data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, selectedChildId]);

  useEffect(() => {
    loadParentData();
  }, [loadParentData]);

  const openCheckout = (cls: ParentClassItem) => {
    setSelectedClass(cls);
    setCheckoutFeedback(null);
    setPaymentMethod("pm_card_success");
  };

  const handleCompleteBooking = async () => {
    if (!selectedClass || !selectedChildId) return;

    try {
      setSubmitting(true);
      setCheckoutFeedback(null);

      // Step 1: Initiate Booking
      const initRes = await fetchWithAuth("/api/bookings/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass.id,
          studentId: selectedChildId,
        }),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        if (initRes.status === 409) {
          setCheckoutFeedback({
            type: "conflict",
            message: "Duplicate Booking Blocked",
            details: initData.error || "This child already has a confirmed booking in this class.",
          });
          return;
        }
        setCheckoutFeedback({
          type: "error",
          message: "Registration Failed",
          details: initData.error || "Could not initiate booking.",
        });
        return;
      }

      const bookingId = initData.bookingId;

      // Step 2: Confirm Booking & Process Payment (Flash-Sale Concurrency Resolution)
      const confirmRes = await fetchWithAuth("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          paymentMethod,
        }),
      });

      const confirmData = await confirmRes.json();

      if (confirmRes.ok) {
        setCheckoutFeedback({
          type: "success",
          message: "Trial Class Booked Successfully!",
          details: `Seat #${confirmData.confirmedSeatNumber} secured for ${initData.studentName}. Transaction ref: ${confirmData.transactionRef}`,
        });
        loadParentData();
        onBookingAction?.();
      } else if (confirmRes.status === 409) {
        // Last-Seat Race Conflict: Lost to concurrent checkout
        setCheckoutFeedback({
          type: "conflict",
          message: "Class Full (Race Condition)",
          details: confirmData.error || "Another user completed payment for the last seat first. You were not charged.",
        });
        loadParentData();
        onBookingAction?.();
      } else if (confirmRes.status === 402) {
        // Simulated Payment Decline
        setCheckoutFeedback({
          type: "error",
          message: "Payment Declined",
          details: confirmData.error || "Card declined. Booking marked payment_failed. No seat was allocated.",
        });
        loadParentData();
        onBookingAction?.();
      } else {
        setCheckoutFeedback({
          type: "error",
          message: "Confirmation Error",
          details: confirmData.error || "An unexpected error occurred.",
        });
      }
    } catch (err) {
      console.error("Booking error:", err);
      setCheckoutFeedback({
        type: "error",
        message: "Network Error",
        details: "Failed to connect to the booking service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="space-y-8">
      {/* Parent Header & Child Selector Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Parent Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
          </div>
        </div>

        {/* Child Scoping Selector (Strict Parent Isolation) */}
        <div className="flex items-center space-x-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label htmlFor="child-select" className="text-xs font-bold text-slate-700 pl-1">
            Registering for:
          </label>
          <select
            id="child-select"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
          >
            {children.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name} ({ch.age} years old)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Available Classes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Available Trial Classes</h3>
            <p className="text-xs text-slate-500">Trial classes are strictly capped at 4 students per class.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{classes.length} classes available</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading trial classes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const isFull = cls.confirmedCount >= cls.maxCapacity;
              const isRaceReady = cls.confirmedCount === 3;

              return (
                <div
                  key={cls.id}
                  className={`bg-white rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                    isFull
                      ? "border-slate-200 bg-slate-50/60 opacity-80"
                      : isRaceReady
                      ? "border-amber-300 ring-2 ring-amber-100 shadow-sm"
                      : "border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700">
                        {cls.subject}
                      </span>
                      {isFull ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                          FULL (4/4)
                        </span>
                      ) : isRaceReady ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 animate-pulse">
                          ⚡ 1 SEAT LEFT (3/4)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700">
                          {cls.confirmedCount} / 4 Seats
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {cls.title}
                    </h4>

                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <p>
                        Instructor: <strong className="text-slate-700">{cls.teacher.name}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(cls.startTime).toLocaleDateString()} at{" "}
                        {new Date(cls.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">$35.00 SGD</span>
                    <button
                      disabled={isFull}
                      onClick={() => openCheckout(cls)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        isFull
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : isRaceReady
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      }`}
                    >
                      {isFull ? "Class Full" : "Book Trial"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking & Transaction History Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              Your Family Booking & Transaction History
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail showing successful enrollments, payment failures, and race condition outcomes.
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No booking records found for your family yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Trial Class</th>
                    <th className="px-4 py-3">Instructor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Transaction Ref</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => {
                    const latestTxn = rec.paymentAttempts[0];

                    const getStatusBadge = (status: string) => {
                      switch (status) {
                        case "CONFIRMED":
                          return (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                            </span>
                          );
                        case "PAYMENT_FAILED":
                          return (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <XCircle className="w-3 h-3" /> PAYMENT_FAILED
                            </span>
                          );
                        case "REJECTED_CAPACITY_FULL":
                          return (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                              <AlertTriangle className="w-3 h-3" /> RACE_LOST (Refunded)
                            </span>
                          );
                        default:
                          return (
                            <span className="inline-flex items-center font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {status}
                            </span>
                          );
                      }
                    };

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{rec.student.name}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{rec.trialClass.title}</td>
                        <td className="px-4 py-3">{rec.trialClass.teacher.name}</td>
                        <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {latestTxn?.transactionRef || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Book Trial Class
              </h3>
              <button
                onClick={() => setSelectedClass(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <p className="font-bold text-slate-900 text-sm">{selectedClass.title}</p>
                <p className="text-slate-600">Child: <strong className="text-slate-900">{selectedChild?.name}</strong></p>
                <p className="text-slate-600">Teacher: <strong className="text-slate-900">{selectedClass.teacher.name}</strong></p>
                <p className="text-slate-600">Current Seats: <strong className="text-slate-900">{selectedClass.confirmedCount} / 4</strong></p>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Amount:</span>
                  <span>$35.00 SGD</span>
                </div>
              </div>

              {/* Mock Payment Simulation Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Simulate Payment Card Outcome:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pm_card_success")}
                    className={`p-2.5 rounded-xl border font-semibold text-left transition-all ${
                      paymentMethod === "pm_card_success"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold">Card: Success</p>
                    <p className="text-[10px] text-slate-500 font-normal">Approved transaction</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pm_card_decline")}
                    className={`p-2.5 rounded-xl border font-semibold text-left transition-all ${
                      paymentMethod === "pm_card_decline"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-100"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold">Card: Decline</p>
                    <p className="text-[10px] text-slate-500 font-normal">Simulate payment fail</p>
                  </button>
                </div>
              </div>

              {/* Feedback Alerts */}
              {checkoutFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    checkoutFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : checkoutFeedback.type === "conflict"
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    {checkoutFeedback.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {checkoutFeedback.type === "conflict" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    {checkoutFeedback.type === "error" && <XCircle className="w-4 h-4 text-rose-600" />}
                    {checkoutFeedback.message}
                  </p>
                  {checkoutFeedback.details && <p className="text-[11px] leading-relaxed">{checkoutFeedback.details}</p>}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                disabled={submitting}
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>

              <button
                disabled={submitting || checkoutFeedback?.type === "success"}
                onClick={handleCompleteBooking}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm & Pay ($35)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
