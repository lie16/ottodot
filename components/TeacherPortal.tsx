"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersona } from "./PersonaContext";
import { GraduationCap, Calendar, Users, ShieldAlert, CheckCircle2 } from "lucide-react";

interface TeacherClassItem {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  maxCapacity: number;
  confirmedCount: number;
}

interface TeacherRosterStudent {
  studentId: string;
  name: string;
  age: number;
  confirmedAt: string;
}

interface TeacherRosterData {
  classId: string;
  title: string;
  subject: string;
  startTime: string;
  confirmedCount: number;
  maxCapacity: number;
  students: TeacherRosterStudent[];
}

export function TeacherPortal() {
  const { currentUser, fetchWithAuth } = usePersona();
  const [classes, setClasses] = useState<TeacherClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<TeacherRosterData | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const loadTeacherClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0 && !activeClassId) {
          setActiveClassId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load teacher classes:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, activeClassId]);

  const loadRoster = useCallback(async (classId: string) => {
    try {
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
  }, [fetchWithAuth]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    if (activeClassId) {
      loadRoster(activeClassId);
    }
  }, [activeClassId, loadRoster]);

  return (
    <div className="space-y-6">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{currentUser.name}</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/20 rounded-full">
                Educator Portal
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              {currentUser.specialty || currentUser.description} • Scoped strictly to your assigned classes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-900/50 px-3.5 py-2 rounded-xl border border-blue-600/40 text-xs">
          <ShieldAlert className="w-4 h-4 text-blue-300" />
          <span className="text-blue-100">Financial/billing data excluded for student privacy</span>
        </div>
      </div>

      {/* Main Layout: Left Class List, Right Attendance Roster */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          Loading assigned classes...
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          No classes currently assigned to {currentUser.name}.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Class Sidebar */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Your Scheduled Classes ({classes.length})
            </h3>
            <div className="space-y-2">
              {classes.map((cls) => {
                const isSelected = cls.id === activeClassId;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setActiveClassId(cls.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-100"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {cls.subject}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {cls.confirmedCount} / 4 Confirmed
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{cls.title}</h4>
                    <div className="mt-2 flex items-center text-xs text-slate-500 gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(cls.startTime).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roster Panel */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Student Preparation Roster
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rosterData ? rosterData.title : "Select a class to view registered students"}
                  </p>
                </div>
                {rosterData && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                    {rosterData.confirmedCount} / 4 Students
                  </span>
                )}
              </div>

              {rosterLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
              ) : !rosterData || rosterData.students.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No confirmed students registered for this class yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {rosterData.students.map((student, idx) => (
                    <div
                      key={student.studentId}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500">Age: {student.age} years old</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready for class</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Teacher ID: {currentUser.id}</span>
              <span>Data isolation verified: Cross-class rosters blocked</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
