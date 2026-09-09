import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  const logs = await getAuditLogs(limit);
  return NextResponse.json(logs);
}
