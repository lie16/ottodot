"use client";

import React, { useState } from "react";
import { PersonaProvider, usePersona } from "@/components/PersonaContext";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { AdminDashboard } from "@/components/AdminDashboard";
import { TeacherPortal } from "@/components/TeacherPortal";
import { ParentPortal } from "@/components/ParentPortal";
import { AdminTestRunner } from "@/components/AdminTestRunner";
import { LiveAuditFeed } from "@/components/LiveAuditFeed";

function MainAppContent() {
  const { currentRole } = usePersona();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTriggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <PersonaSwitcher />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Role-Specific Portal Rendering */}
        {currentRole === "Admin" && (
          <div className="space-y-8">
            {/* Admin-Only Test Execution Panel */}
            <AdminTestRunner onTestCompleted={handleTriggerRefresh} />

            {/* Global Class Oversight & Full Roster View */}
            <AdminDashboard onRefreshNeeded={refreshKey} />
          </div>
        )}

        {currentRole === "Teacher" && (
          <div>
            {/* Scoped Teacher Attendance View */}
            <TeacherPortal />
          </div>
        )}

        {currentRole === "Parent" && (
          <div>
            {/* Parent Class Discovery & Isolated Child Registration */}
            <ParentPortal onBookingAction={handleTriggerRefresh} />
          </div>
        )}

        {/* Global Live Audit & Concurrency Trace Stream */}
        <div className="pt-4">
          <LiveAuditFeed refreshTrigger={refreshKey} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Ottodot Full-Stack Take-Home Assessment • Powered by Next.js 14, Prisma ORM & PostgreSQL
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <PersonaProvider>
      <MainAppContent />
    </PersonaProvider>
  );
}
