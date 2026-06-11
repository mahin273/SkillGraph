import { useEffect, useState } from "react";
import { getIngestionJobs, IngestionJob } from "../../services/admin.service";
import { 
  RefreshCw, CheckCircle2, AlertCircle, Clock, 
  Loader2, Play, Search, Database, ListOrdered 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function JobQueueMonitor() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchJobs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getIngestionJobs();
      setJobs(data);
      setError(undefined);
    } catch (err: any) {
      setError(err.message || "Failed to fetch ingestion jobs");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
    // Poll every 5 seconds
    const interval = setInterval(() => {
      void fetchJobs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStats = () => {
    const stats = {
      total: jobs.length,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    jobs.forEach((job) => {
      if (job.status === "queued") stats.queued++;
      else if (job.status === "processing") stats.processing++;
      else if (job.status === "completed") stats.completed++;
      else if (job.status === "failed") stats.failed++;
    });
    return stats;
  };

  const stats = getStats();

  const getDuration = (job: IngestionJob) => {
    if (!job.startedAt) return "N/A";
    const start = new Date(job.startedAt).getTime();
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    const diff = end - start;
    if (diff < 0) return "0s";
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      !searchTerm || 
      job.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.jobId && job.jobId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Jobs</div>
          <div className="mt-1 text-2xl font-bold text-[#17202a]">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Queued</div>
          <div className="mt-1 text-2xl font-bold text-[#0c66e4]">{stats.queued}</div>
        </div>
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Processing</div>
          <div className="mt-1 text-2xl font-bold text-[#e2b200] flex items-center gap-1.5">
            {stats.processing > 0 && <Loader2 className="size-5 animate-spin" />}
            {stats.processing}
          </div>
        </div>
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</div>
          <div className="mt-1 text-2xl font-bold text-[#1f845a]">{stats.completed}</div>
        </div>
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failed</div>
          <div className="mt-1 text-2xl font-bold text-[#ca3521]">{stats.failed}</div>
        </div>
      </div>

      <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
        {/* Header and Controls */}
        <div className="flex flex-col gap-4 border-b border-[#edf0f5] pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
              <Database className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#17202a]">Background Ingestion Monitor</h2>
              <p className="text-xs text-muted-foreground">Monitor background jobs parsing GitHub repositories and computing skill growth.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded-md border border-[#cfd7e3] bg-[#f7f8fa] pl-8 pr-2.5 text-xs outline-none focus:border-[#0c66e4]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-[#cfd7e3] bg-white px-2.5 text-xs text-[#17202a] outline-none focus:border-[#0c66e4]"
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <Button
              onClick={() => void fetchJobs()}
              variant="outline"
              size="sm"
              className="h-8 border-[#cfd7e3] text-[#17202a]"
            >
              <RefreshCw className="size-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

        {loading && jobs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading jobs catalog...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No active or historical ingestion jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dfe3ea] bg-[#f7f8fa] text-muted-foreground font-semibold uppercase">
                  <th className="p-3">User ID</th>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Repos Found</th>
                  <th className="p-3">Skills Parsed</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Queued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {filteredJobs.map((job) => (
                  <tr key={job.jobId || job.userId} className="hover:bg-[#f7f8fa]">
                    <td className="p-3 font-medium text-[#17202a]">{job.userId}</td>
                    <td className="p-3 text-muted-foreground">{job.jobId || "N/A"}</td>
                    <td className="p-3">
                      {job.status === "queued" && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#deebff] px-2 py-0.5 font-semibold text-[#0747a6]">
                          <Play className="size-3" /> Queued
                        </span>
                      )}
                      {job.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#fff0b3] px-2 py-0.5 font-semibold text-[#825c00]">
                          <Loader2 className="size-3 animate-spin" /> Processing
                        </span>
                      )}
                      {job.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#e3fcef] px-2 py-0.5 font-semibold text-[#006644]">
                          <CheckCircle2 className="size-3" /> Completed
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#ffebe6] px-2 py-0.5 font-semibold text-[#bf2600]">
                          <AlertCircle className="size-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[#17202a]">{job.repositoryCount ?? "-"}</td>
                    <td className="p-3 text-[#17202a]">
                      {job.skillsFound !== undefined ? (
                        <Badge variant="secondary" className="bg-[#e7f8ef] text-[#1f845a] hover:bg-[#e7f8ef]">
                          {job.skillsFound} skills
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {getDuration(job)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {job.queuedAt ? new Date(job.queuedAt).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Failed Jobs Error Messages Log */}
        {jobs.some((j) => j.status === "failed") && (
          <div className="mt-8 border-t border-[#edf0f5] pt-6">
            <h3 className="text-sm font-semibold text-[#17202a] mb-3 flex items-center gap-1.5">
              <AlertCircle className="size-4 text-[#ca3521]" />
              Failed Jobs Ingestion Diagnostics
            </h3>
            <div className="space-y-3">
              {jobs
                .filter((j) => j.status === "failed")
                .map((job) => (
                  <div key={job.jobId || job.userId} className="rounded-lg border border-[#ffebe6] bg-[#ffebe6]/40 p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-[#bf2600]">User: {job.userId}</span>
                      <span className="text-muted-foreground">Job ID: {job.jobId || "N/A"}</span>
                    </div>
                    <p className="text-xs font-mono text-[#ca3521] bg-white p-2.5 rounded border border-[#ffebe6] whitespace-pre-wrap">
                      {job.error || "Unknown ingestion failure. Please check queue server container logs."}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
