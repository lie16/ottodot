import { headers } from "next/headers";

export type UserRole = "Admin" | "Teacher" | "Parent";

export interface UserContext {
  userId: string | null;
  role: UserRole | null;
}

export function getUserContext(): UserContext {
  const reqHeaders = headers();
  const userId = reqHeaders.get("x-user-id");
  const role = reqHeaders.get("x-user-role") as UserRole | null;

  return {
    userId: userId || null,
    role: role || null,
  };
}

export function requireAdmin(): void {
  const { role } = getUserContext();
  if (role !== "Admin") {
    throw new Error("FORBIDDEN_ADMIN_ONLY");
  }
}

export function requireTeacher(): string {
  const { userId, role } = getUserContext();
  if (role !== "Teacher" || !userId) {
    throw new Error("FORBIDDEN_TEACHER_ONLY");
  }
  return userId;
}

export function requireParent(): string {
  const { userId, role } = getUserContext();
  if (role !== "Parent" || !userId) {
    throw new Error("FORBIDDEN_PARENT_ONLY");
  }
  return userId;
}
