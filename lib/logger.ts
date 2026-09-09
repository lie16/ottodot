import { prisma } from "./prisma";

export type TestTag =
  | "[TEST:RACE_CONDITION]"
  | "[TEST:DUPLICATE_BOOKING]"
  | "[TEST:PAYMENT_FAILURE]"
  | "[TEST:CAPACITY_LIMIT]"
  | "[TEST:AUTH_ISOLATION]"
  | "[TEST:SYSTEM_INIT]";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: TestTag | string;
  event: string;
  details: string;
}

// In-memory ring buffer for low-latency live audit streaming in UI
const MAX_BUFFER_SIZE = 150;
const memoryLogBuffer: LogEntry[] = [];

export async function logAuditEvent(
  tag: TestTag | string,
  event: string,
  details: Record<string, unknown> | string,
  level: LogLevel = "INFO"
): Promise<LogEntry> {
  const detailsStr = typeof details === "string" ? details : JSON.stringify(details);
  const now = new Date();
  const timestampIso = now.toISOString();

  // 1. Log formatted stdout for terminal/CLI evaluators
  console.log(`[${timestampIso}] [${level}] ${tag} [${event}] ${detailsStr}`);

  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: timestampIso,
    level,
    tag,
    event,
    details: detailsStr,
  };

  // 2. Append to in-memory circular buffer
  memoryLogBuffer.unshift(entry);
  if (memoryLogBuffer.length > MAX_BUFFER_SIZE) {
    memoryLogBuffer.pop();
  }

  // 3. Persist to PostgreSQL database asynchronously
  try {
    await prisma.auditLog.create({
      data: {
        timestamp: now,
        level,
        tag,
        event,
        details: detailsStr,
      },
    });
  } catch (err) {
    console.error("Failed to persist audit log to DB:", err);
  }

  return entry;
}

export async function getAuditLogs(limit = 50): Promise<LogEntry[]> {
  try {
    const dbLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return dbLogs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      level: l.level as LogLevel,
      tag: l.tag,
      event: l.event,
      details: l.details,
    }));
  } catch {
    // Fallback to memory buffer if database query fails
    return memoryLogBuffer.slice(0, limit);
  }
}
