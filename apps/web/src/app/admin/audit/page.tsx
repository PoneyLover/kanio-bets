"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface AuditLogRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
  admin: { username: string; email: string };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ logs: AuditLogRow[] }>("/api/admin/audit-logs")
      .then((res) => setLogs(res.logs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Journal d&apos;audit</h2>
      {loading && <p className="text-kanio-muted">Chargement...</p>}
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="card p-4 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{log.action}</span>
              <span className="text-kanio-muted text-xs">{formatDateTime(log.createdAt)}</span>
            </div>
            <p className="text-kanio-muted text-xs">
              Par {log.admin.username} - Cible : {log.targetType} ({log.targetId})
            </p>
            {log.reason && <p className="text-xs mt-1">Justification : {log.reason}</p>}
          </div>
        ))}
        {!loading && logs.length === 0 && <p className="text-kanio-muted">Aucune action enregistree.</p>}
      </div>
    </div>
  );
}
