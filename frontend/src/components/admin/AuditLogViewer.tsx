import { useEffect, useState } from "react";
import { listAuditLogs, downloadAuditLogsCsv } from "../../services/admin.service";
import { Clock, Database, Eye, FileText, Globe, Search, User, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await listAuditLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, []);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await downloadAuditLogsCsv({
        action: selectedAction,
        entity: selectedEntity,
        search: searchTerm
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export CSV: " + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  const actions = Array.from(new Set(logs.map((log) => log.action).filter(Boolean)));
  const entities = Array.from(new Set(logs.map((log) => log.entity).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      log.action?.toLowerCase().includes(searchString) ||
      log.user?.fullName?.toLowerCase().includes(searchString) ||
      log.user?.email?.toLowerCase().includes(searchString) ||
      log.entity?.toLowerCase().includes(searchString);

    const matchesAction = !selectedAction || log.action === selectedAction;
    const matchesEntity = !selectedEntity || log.entity === selectedEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading audit logs...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#edf0f5] pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-[#fff4e5] text-[#974f0c]">
            <FileText className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#17202a]">Security & System Audit Logs</h2>
            <p className="text-xs text-muted-foreground">Monitor system actions, entity modifications, and logins.</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search action or user"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-[#cfd7e3] bg-[#f7f8fa] pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 bg-[#f7f8fa] p-3 rounded-lg border border-[#dfe3ea]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#17202a]">Action:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-8 rounded-md border border-[#cfd7e3] bg-white px-2.5 text-xs text-[#17202a] outline-none focus:border-[#0c66e4]"
          >
            <option value="">All Actions</option>
            {actions.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#17202a]">Entity:</span>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="h-8 rounded-md border border-[#cfd7e3] bg-white px-2.5 text-xs text-[#17202a] outline-none focus:border-[#0c66e4]"
          >
            <option value="">All Entities</option>
            {entities.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto">
          <Button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 h-8 bg-[#0c66e4] text-white hover:bg-[#0055cc] text-xs px-3"
          >
            <Download className="size-3.5" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">No matching audit logs found.</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-3 rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0c66e4]">
                  <Database className="size-3.5" />
                  {log.action}
                </div>
                <div className="flex items-center gap-1 text-xs text-[#17202a]">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{log.user?.fullName || "System/Anonymous"}</span>
                  <span className="text-muted-foreground">({log.user?.email || "internal"})</span>
                </div>
                {log.entity && (
                  <div className="rounded bg-[#edf0f5] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Entity: {log.entity}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {log.ipAddress && (
                  <span className="flex items-center gap-1">
                    <Globe className="size-3.5" />
                    {log.ipAddress}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                {log.metadata && (
                  <button
                    onClick={() => alert(JSON.stringify(log.metadata, null, 2))}
                    className="flex items-center gap-0.5 text-[#0c66e4] hover:underline"
                  >
                    <Eye className="size-3" />
                    Details
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
