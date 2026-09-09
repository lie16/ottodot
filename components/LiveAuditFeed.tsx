"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersona } from "./PersonaContext";
import { Terminal, RefreshCw } from "lucide-react";

interface LogItem {
  id: string;
  timestamp: string;
  level: string;
  tag: string;
  event: string;
  details: string;
}

export function LiveAuditFeed({ refreshTrigger }: { refreshTrigger?: number }) {
  const { fetchWithAuth } = usePersona();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/audit-logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  // Auto-polling every 3 seconds for live streaming
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const getTagColor = (tag: string) => {
    if (tag.includes("RACE_CONDITION")) return "bg-amber-100 text-amber-900 border-amber-300";
    if (tag.includes("DUPLICATE_BOOKING")) return "bg-blue-100 text-blue-900 border-blue-300";
    if (tag.includes("PAYMENT_FAILURE")) return "bg-rose-100 text-rose-900 border-rose-300";
    if (tag.includes("AUTH_ISOLATION")) return "bg-red-100 text-red-900 border-red-300";
    if (tag.includes("CAPACITY_LIMIT")) return "bg-purple-100 text-purple-900 border-purple-300";
    if (tag.includes("SYSTEM_INIT")) return "bg-emerald-100 text-emerald-900 border-emerald-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-5 text-slate-100 shadow-lg border border-slate-800 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm tracking-wide text-white">
            System Live Audit & Test Trace Log
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            Live Stream (3s)
          </label>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="py-6 text-center text-slate-500">No audit logs recorded yet.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2"
            >
              <div className="space-y-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getTagColor(
                      log.tag
                    )}`}
                  >
                    {log.tag}
                  </span>
                  <span className="text-slate-300 font-semibold text-[11px]">{log.event}</span>
                </div>
                <p className="text-slate-400 text-[11px] truncate">{log.details}</p>
              </div>

              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 self-start sm:self-auto ${
                  log.level === "SUCCESS"
                    ? "text-emerald-400 bg-emerald-950/80 border border-emerald-800"
                    : log.level === "ERROR"
                    ? "text-rose-400 bg-rose-950/80 border border-rose-800"
                    : log.level === "WARN"
                    ? "text-amber-400 bg-amber-950/80 border border-amber-800"
                    : "text-slate-400 bg-slate-800"
                }`}
              >
                {log.level}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
