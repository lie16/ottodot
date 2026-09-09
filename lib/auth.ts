import { headers } from "next/headers";

export type UserRole = "Admin" | "Teacher" | "Parent";

export interface UserContext {
  userId: string | null;
  role: UserRole | null;
}

export function getUserContext(request?: Request): UserContext {
  let userId: string | null = null;
  let role: UserRole | null = null;

  if (request && request.headers) {
    userId = request.headers.get("x-user-id");
    role = request.headers.get("x-user-role") as UserRole | null;
  } else {
    try {
      const reqHeaders = headers();
      userId = reqHeaders.get("x-user-id");
      role = reqHeaders.get("x-user-role") as UserRole | null;
    } catch {
      // When called outside Next.js request context (e.g. unit tests)
    }
  }

  return {
    userId: userId || null,
    role: role || null,
  };
}

export function requireAdmin(request?: Request): void {
  const { role } = getUserContext(request);
  if (role !== "Admin") {
    throw new Error("FORBIDDEN_ADMIN_ONLY");
  }
}

export function requireTeacher(request?: Request): string {
  const { userId, role } = getUserContext(request);
  if (role !== "Teacher" || !userId) {
    throw new Error("FORBIDDEN_TEACHER_ONLY");
  }
  return userId;
}

export function requireParent(request?: Request): string {
  const { userId, role } = getUserContext(request);
  if (role !== "Parent" || !userId) {
    throw new Error("FORBIDDEN_PARENT_ONLY");
  }
  return userId;
}
