import { useEffect, useState } from "react";
import { getGithubConnections, GithubConnection, GithubRateLimit } from "../../services/admin.service";
import { 
  Github, RefreshCw, Users, ShieldAlert, 
  HelpCircle, CheckCircle2, Clock, BatteryCharging
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GithubConnectionDashboard() {
  const [connections, setConnections] = useState<GithubConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [rateLimit, setRateLimit] = useState<GithubRateLimit | null>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await getGithubConnections();
      setConnections(data.connections);
      setRateLimit(data.rateLimit);
      setError(undefined);
    } catch (err: any) {
      setError(err.message || "Failed to load GitHub connections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConnections();
  }, []);

  const rateLimitPercentage = rateLimit ? Math.round((rateLimit.remaining / rateLimit.limit) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Rate Limit and Integrations Statistics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Rate Limit Indicator Card */}
        <div className="md:col-span-2 rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BatteryCharging className="size-5 text-[#0c66e4]" />
                <h3 className="text-sm font-semibold text-[#17202a]">GitHub API Quota Monitor</h3>
              </div>
              <Badge variant="outline" className="border-[#0c66e4] text-[#0c66e4] bg-[#deebff]/20">
                {rateLimit ? `Resets in ${rateLimit.resetMins}m` : "Unavailable"}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              GitHub API rate limit usage for the latest stored GitHub OAuth connection.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#17202a]">
              <span>API Rate Quota Remaining</span>
              <span>
                {rateLimit
                  ? `${rateLimit.remaining.toLocaleString()} / ${rateLimit.limit.toLocaleString()} requests`
                  : "Connect GitHub to inspect quota"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#edf0f5]">
              <div 
                className="h-2 rounded-full bg-[#0c66e4] transition-all duration-500" 
                style={{ width: `${rateLimitPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0% consumed</span>
              <span>{rateLimit ? `${rateLimitPercentage}% remaining` : "No live quota data"}</span>
            </div>
          </div>
        </div>

        {/* Sync Summary Card */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-5 text-[#1f845a]" />
              <h3 className="text-sm font-semibold text-[#17202a]">Integration Health</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#edf0f5] pb-2">
                <span className="text-xs text-muted-foreground">Total Linked Accounts</span>
                <span className="text-sm font-bold text-[#17202a]">{connections.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#edf0f5] pb-2">
                <span className="text-xs text-muted-foreground">OAuth Scope Granted</span>
                <Badge variant="secondary" className="text-[10px] bg-[#edf0f5] text-muted-foreground">
                  repo, read:user
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sync Status</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#1f845a]">
                  <CheckCircle2 className="size-3.5" /> Healthy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#edf0f5] pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[#e3fcef] text-[#006644]">
              <Github className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#17202a]">GitHub Linked Profiles</h2>
              <p className="text-xs text-muted-foreground">View and manage student OAuth connections and sync schedules.</p>
            </div>
          </div>
          <Button
            onClick={fetchConnections}
            variant="outline"
            size="sm"
            className="h-8 border-[#cfd7e3] text-[#17202a] ml-auto"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <ShieldAlert className="size-8 text-[#ca3521]" />
            <span>No student profiles are currently linked to GitHub.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dfe3ea] bg-[#f7f8fa] text-muted-foreground font-semibold uppercase">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Connection ID</th>
                  <th className="p-3">Linked Date</th>
                  <th className="p-3">Last Sync Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-[#f7f8fa]">
                    <td className="p-3 font-medium text-[#17202a]">{conn.fullName}</td>
                    <td className="p-3 text-muted-foreground">{conn.email}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded bg-[#deebff] px-2 py-0.5 font-semibold text-[#0747a6]">
                        <Github className="size-3" /> GitHub
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{conn.id}</td>
                    <td className="p-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-[#8c9bab]" />
                        {new Date(conn.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-[#8c9bab]" />
                        {conn.lastUsedAt ? new Date(conn.lastUsedAt).toLocaleString() : "Never Synced"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
