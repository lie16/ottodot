"use client";

import React from "react";
import { usePersona } from "./PersonaContext";
import { ALL_PERSONAS, Persona } from "@/lib/personas";
import { UserCheck, ShieldCheck, GraduationCap, Users } from "lucide-react";

export function PersonaSwitcher() {
  const { currentRole, currentUser, setRole, setUser } = usePersona();

  const roleOptions: Array<"Admin" | "Teacher" | "Parent"> = ["Admin", "Teacher", "Parent"];
  const userOptions = ALL_PERSONAS[currentRole] || [];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin":
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case "Teacher":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case "Parent":
        return <Users className="w-4 h-4 text-emerald-600" />;
      default:
        return <UserCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-100">
            O
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Ottodot Booking</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Reliable Trial Class System</p>
          </div>
        </div>

        {/* Persona Switcher Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          {/* Step 1: Role Select */}
          <div className="flex items-center space-x-1.5 pl-2">
            {getRoleIcon(currentRole)}
            <label htmlFor="role-select" className="text-xs font-semibold text-slate-600 hidden md:block">
              Role:
            </label>
            <select
              id="role-select"
              value={currentRole}
              onChange={(e) => setRole(e.target.value as "Admin" | "Teacher" | "Parent")}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-300">/</span>

          {/* Step 2: User Select */}
          <div className="flex items-center space-x-1.5 pr-1">
            <label htmlFor="user-select" className="text-xs font-semibold text-slate-600 hidden md:block">
              User:
            </label>
            <select
              id="user-select"
              value={currentUser.id}
              onChange={(e) => {
                const selected = userOptions.find((u) => u.id === e.target.value);
                if (selected) setUser(selected);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs cursor-pointer max-w-[160px] sm:max-w-none truncate"
            >
              {userOptions.map((u: Persona) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.description ? `(${u.description})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Active Context Tag */}
          <div className="hidden lg:flex items-center px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[10px] font-mono rounded">
            auth: {currentUser.id}
          </div>
        </div>
      </div>
    </header>
  );
}
