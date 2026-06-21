import { useEffect, useState } from "react";
import {
  getSystemHealth,
  getSecurityThreats,
  type HealthStatus,
  type ThreatStats
} from "../../services/admin.service";
import { api } from "../../services/api";
import {
  Activity,
  Database,
  ShieldAlert,
  Download,
  Loader2,
  AlertCircle,
  Clock,
  Server,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  HardDrive
} from "lucide-react";

export function SecurityThreatManager() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [threats, setThreats] = useState<ThreatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthData, threatData] = await Promise.all([
        getSystemHealth(),
        getSecurityThreats()
      ]);
      setHealth(healthData);
      setThreats(threatData);
      setError(null);
    } catch (err) {
      console.error("Failed to load health and threat metrics:", err);
      setError("Failed to load security monitor metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      // Direct API hit to trigger attachment download
      const response = await api.get("/admin/export-anonymized", {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "anonymized_skills_dataset.json");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export anonymized dataset:", err);
      alert("Failed to export dataset.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading system infrastructure stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error}</p>
        <button
          onClick={() => void fetchData()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const services = (health?.services || {}) as Record<string, string>;
  const activeThreatLevel = threats?.threatMetrics?.activeThreatLevel || "LOW";

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 1. Infrastructure Status Check */}
      <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-100 pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              Microservices Health
            </span>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Infrastructure Service Checks</h3>
            <p className="text-xs text-slate-500">Real-time dependency verification for Docker cluster containers.</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(services).map(([name, status]) => {
              const isHealthy = status === "healthy" || status === "ok";
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#fbfcfe] p-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 capitalize">
                      {name.replace(/([A-Z])/g, " $1")}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {name === "postgres" ? "Main Relational DB" : name === "redis" ? "Memory Ingestion Cache" : "Background Service"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                      isHealthy
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                        : "bg-rose-50 text-rose-800 border-rose-100"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Metrics size */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-indigo-600" />
            <div>
              <p className="text-[11px] font-bold text-slate-700">Relational Database Volume Size</p>
              <p className="text-[10px] text-slate-400">Total size pretty-printed on storage mount</p>
            </div>
          </div>
          <span className="text-sm font-extrabold text-slate-900 border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-lg">
            {health?.metrics?.databaseSize || "Unknown"}
          </span>
        </div>
      </section>

      {/* 2. Threat Metrics */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-100 pb-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                activeThreatLevel === "HIGH"
                  ? "bg-rose-50 border-rose-100 text-rose-800"
                  : activeThreatLevel === "MEDIUM"
                  ? "bg-amber-50 border-amber-100 text-amber-800"
                  : "bg-emerald-50 border-emerald-100 text-emerald-800"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Active System Threats: {activeThreatLevel}
            </span>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Security Threat Level</h3>
            <p className="text-xs text-slate-500">Security event aggregates from audit log analytics.</p>
          </div>

          <div className="mt-6 space-y-4">
            {/* KPI 1 */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-semibold text-slate-500">Successful Logins</span>
              <span className="text-sm font-bold text-slate-800">
                {threats?.threatMetrics?.loginSuccess || 0}
              </span>
            </div>

            {/* KPI 2 */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-rose-500" />
                Failed Logins (Alert Trigger)
              </span>
              <span
                className={`text-sm font-bold ${
                  (threats?.threatMetrics?.loginFailed || 0) > 0 ? "text-rose-600" : "text-slate-800"
                }`}
              >
                {threats?.threatMetrics?.loginFailed || 0}
              </span>
            </div>

            {/* KPI 3 */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-semibold text-slate-500">Settings Config Updates</span>
              <span className="text-sm font-bold text-slate-800">
                {threats?.threatMetrics?.configUpdates || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Anonymized Export Button */}
        <div className="mt-6">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs py-2.5 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Exporting Data...
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                Export Anonymized Dataset
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. Recent Failed Logins Log Table */}
      <section className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
            <KeyRound className="h-3.5 w-3.5 text-slate-600" />
            Authentication Alerts
          </span>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Recent Login Failures</h3>
          <p className="text-xs text-slate-500">Real-time threat monitoring table tracking failed login attempts.</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
                <th className="px-4 py-3">User Target</th>
                <th className="px-4 py-3">Target Email</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 flex items-center gap-1">
                  <Clock className="size-3.5" />
                  Time Detected
                </th>
              </tr>
            </thead>
            <tbody>
              {threats?.recentFailures.map(log => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{log.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{log.email}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{log.ipAddress}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {threats?.recentFailures.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                    No failed login attempts detected in logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
