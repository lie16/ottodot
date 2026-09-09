"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Persona, ADMIN_PERSONAS, ALL_PERSONAS } from "@/lib/personas";

interface PersonaContextType {
  currentRole: "Admin" | "Teacher" | "Parent";
  currentUser: Persona;
  setRole: (role: "Admin" | "Teacher" | "Parent") => void;
  setUser: (user: Persona) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<"Admin" | "Teacher" | "Parent">("Admin");
  const [currentUser, setCurrentUser] = useState<Persona>(ADMIN_PERSONAS[0]);

  // Load from localStorage on client mount if available
  useEffect(() => {
    const savedRole = localStorage.getItem("ottodot_role") as "Admin" | "Teacher" | "Parent" | null;
    const savedUserId = localStorage.getItem("ottodot_user_id");

    if (savedRole && ALL_PERSONAS[savedRole]) {
      const personas = ALL_PERSONAS[savedRole];
      const match = personas.find((p) => p.id === savedUserId);
      if (match) {
        setCurrentRole(savedRole);
        setCurrentUser(match);
        return;
      }
    }
  }, []);

  const handleSetRole = (role: "Admin" | "Teacher" | "Parent") => {
    setCurrentRole(role);
    const defaultUser = ALL_PERSONAS[role][0];
    setCurrentUser(defaultUser);
    localStorage.setItem("ottodot_role", role);
    localStorage.setItem("ottodot_user_id", defaultUser.id);
  };

  const handleSetUser = (user: Persona) => {
    setCurrentUser(user);
    localStorage.setItem("ottodot_user_id", user.id);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set("x-user-id", currentUser.id);
    headers.set("x-user-role", currentRole);

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return (
    <PersonaContext.Provider
      value={{
        currentRole,
        currentUser,
        setRole: handleSetRole,
        setUser: handleSetUser,
        fetchWithAuth,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return context;
}
