"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersona } from "./PersonaContext";
import { Users, Eye, Sparkles, Filter, CheckCircle2, Clock } from "lucide-react";

interface TrialClassItem {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  maxCapacity: number;
  confirmedCount: number;
  teacher: {
    id: string;
    name: string;
    email: string;
    specialty: string;
  };
}

interface RosterStudent {
  bookingId: string;
  studentId: string;
  name: string;
  age: number;
  parentName: string;
  parentEmail: string;
  confirmedAt: string;
  paymentRef: string;
}

interface ClassRosterData {
  classId: string;
  title: string;
  subject: string;
  teacher: { name: string; email: string };
  confirmedCount: number;
  maxCapacity: number;
  students: RosterStudent[];
}

export function AdminDashboard({ onRefreshNeeded }: { onRefreshNeeded?: number }) {
  const { fetchWithAuth } = usePersona();
  const [classes, setClasses] = useState<TrialClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<ClassRosterData | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses, onRefreshNeeded]);

  const viewRoster = async (classId: string) => {
    try {
      setSelectedClassId(classId);
      setRosterLoading(true);
      const res = await fetchWithAuth(`/api/roster/${classId}`);
      if (res.ok) {
        const data = await res.json();
        setRosterData(data);
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setRosterLoading(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (subjectFilter !== "ALL" && c.subject !== subjectFilter) return false;
    if (capacityFilter === "EMPTY" && c.confirmedCount !== 0) return false;
    if (capacityFilter === "RACE" && c.confirmedCount !== 3) return false;
    if (capacityFilter === "FULL" && c.confirmedCount < 4) return false;
    if (capacityFilter === "OPEN" && c.confirmedCount >= 4) return false;
    return true;
  });

  const getCapacityBadge = (count: number, max: number) => {
    if (count >= max) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          4 / 4 FULL
        </span>
      );
    }
    if (count === 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
          ⚡ 3 / 4 RACE READY (1 Seat Left)
        </span>
      );
    }
    if (count === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          0 / 4 Empty
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
        {count} / {max} Open
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Global Class Management ({classes.length} Trial Classes)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time capacity tracking, full attendance rosters, and transaction auditing across all teachers.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Subject:</span>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Subjects</option>
              <option value="Science">Science</option>
              <option value="Math">Math</option>
              <option value="Technology">Technology</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Capacity:</span>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All States</option>
              <option value="OPEN">Open (&lt; 4 seats)</option>
              <option value="RACE">⚡ 3/4 Race Targets</option>
              <option value="FULL">4/4 Full</option>
              <option value="EMPTY">0/4 Empty</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          Loading classes...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                item.confirmedCount === 3
                  ? "border-amber-300 ring-2 ring-amber-200/50 hover:shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700">
                    {item.subject}
                  </span>
                  {getCapacityBadge(item.confirmedCount, item.maxCapacity)}
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {item.title}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Teacher:</span>
                    <span>{item.teacher.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(item.startTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">ID: {item.id}</span>
                <button
                  onClick={() => viewRoster(item.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Roster ({item.confirmedCount})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roster Modal */}
      {selectedClassId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Trial Class Confirmed Roster
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {rosterData ? `${rosterData.title} (${rosterData.confirmedCount} / 4 Confirmed)` : "Loading..."}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedClassId(null);
                  setRosterData(null);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {rosterLoading || !rosterData ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading student roster...</div>
              ) : rosterData.students.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No confirmed bookings yet for this class. All 4 seats are open.
                </div>
              ) : (
                <div className="space-y-3">
                  {rosterData.students.map((student, idx) => (
                    <div
                      key={student.studentId}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                          <span className="text-slate-500">({student.age} yrs)</span>
                        </div>
                        <p className="text-slate-600">
                          Parent: <strong className="text-slate-800">{student.parentName}</strong> ({student.parentEmail})
                        </p>
                        <p className="text-slate-400 font-mono text-[11px]">
                          Payment Ref: <span className="text-emerald-700 font-semibold">{student.paymentRef}</span>
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {new Date(student.confirmedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedClassId(null);
                  setRosterData(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
