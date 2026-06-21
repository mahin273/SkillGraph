import { useEffect, useState } from "react";
import { getConfig, updateConfig } from "../../services/admin.service";
import { Check, Hourglass, RefreshCw, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SystemConfigEditor() {
  const [decayRate, setDecayRate] = useState(0.15);
  const [cooldownHours, setCooldownHours] = useState(1);
  const [sessionSec, setSessionSec] = useState(900);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isIngestionDisabled, setIsIngestionDisabled] = useState(false);
  const [isNlpThrottled, setIsNlpThrottled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await getConfig();
        setDecayRate(data.skillDecayRate);
        setCooldownHours(data.scanCooldownHours);
        setSessionSec(data.sessionDurationSeconds);
        setIsMaintenanceMode(data.isMaintenanceMode ?? false);
        setIsIngestionDisabled(data.isIngestionDisabled ?? false);
        setIsNlpThrottled(data.isNlpThrottled ?? false);
      } catch (err: any) {
        setError(err.message || "Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };

    void fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(undefined);

    try {
      await updateConfig({
        skillDecayRate: Number(decayRate),
        scanCooldownHours: Number(cooldownHours),
        sessionDurationSeconds: Number(sessionSec),
        isMaintenanceMode,
        isIngestionDisabled,
        isNlpThrottled
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading system settings...</div>;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm max-w-xl">
      <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
        <div className="grid size-9 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
          <Settings className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#17202a]">Global Platform Settings</h2>
          <p className="text-xs text-muted-foreground">Tweak skill calculation weights and session limits.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-5">
        <label className="grid gap-1.5 text-sm font-medium text-[#17202a]">
          Skill Decay Rate (Annual)
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={decayRate}
              onChange={(e) => setDecayRate(parseFloat(e.target.value))}
              className="h-9 w-32 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"
              required
            />
            <span className="text-xs text-muted-foreground">(e.g., 0.15 = 15% decay per dormant year)</span>
          </div>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-[#17202a]">
          GitHub Ingestion Cooldown (Hours)
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="24"
              value={cooldownHours}
              onChange={(e) => setCooldownHours(parseInt(e.target.value))}
              className="h-9 w-32 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"
              required
            />
            <span className="text-xs text-muted-foreground">Hours required between manual student scans.</span>
          </div>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-[#17202a]">
          JWT Login Session duration (Seconds)
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="60"
              value={sessionSec}
              onChange={(e) => setSessionSec(parseInt(e.target.value))}
              className="h-9 w-32 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"
              required
            />
            <span className="text-xs text-muted-foreground">How long user sessions stay valid before auto-logout.</span>
          </div>
        </label>
        <div className="border-t border-[#edf0f5] pt-4 my-2">
          <h3 className="text-sm font-semibold text-[#17202a] mb-3">System Control Panel</h3>
          
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isMaintenanceMode"
                checked={isMaintenanceMode}
                onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                className="mt-1 size-4 rounded border-[#cfd7e3] text-[#0c66e4] focus:ring-[#0c66e4]"
              />
              <label htmlFor="isMaintenanceMode" className="grid gap-0.5 text-sm font-medium text-[#17202a] cursor-pointer">
                Platform Maintenance Mode
                <span className="text-xs font-normal text-muted-foreground">
                  Put the gateway in maintenance mode. Blocks standard students and professors from accessing the platform.
                </span>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isIngestionDisabled"
                checked={isIngestionDisabled}
                onChange={(e) => setIsIngestionDisabled(e.target.checked)}
                className="mt-1 size-4 rounded border-[#cfd7e3] text-[#0c66e4] focus:ring-[#0c66e4]"
              />
              <label htmlFor="isIngestionDisabled" className="grid gap-0.5 text-sm font-medium text-[#17202a] cursor-pointer">
                Disable Manual Ingestion Scans
                <span className="text-xs font-normal text-muted-foreground">
                  Disable manual student GitHub repository ingestion triggers to reduce API rate-limit pressure.
                </span>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isNlpThrottled"
                checked={isNlpThrottled}
                onChange={(e) => setIsNlpThrottled(e.target.checked)}
                className="mt-1 size-4 rounded border-[#cfd7e3] text-[#0c66e4] focus:ring-[#0c66e4]"
              />
              <label htmlFor="isNlpThrottled" className="grid gap-0.5 text-sm font-medium text-[#17202a] cursor-pointer">
                NLP Model Throttle
                <span className="text-xs font-normal text-muted-foreground">
                  Throttle manual or background AI/NLP analysis requests to manage API quota/costs.
                </span>
              </label>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
          >
            {saving ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : success ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving..." : success ? "Saved Successfully!" : "Save Configuration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
