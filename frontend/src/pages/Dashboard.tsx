import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  GitBranch,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { IngestionStatusBanner } from "../components/galaxy/IngestionStatusBanner";
import { SkillGalaxy } from "../components/galaxy/SkillGalaxy";
import { SkillDetailPanel } from "../components/galaxy/SkillDetailPanel";
import type { GalaxyNode } from "../services/graph.service";
import { triggerIngestion, getIngestionStatus } from "../services/graph.service";
import { getCurrentUser } from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { useNavigate } from "react-router-dom";
import { AlumniDashboard } from "./AlumniDashboard";
import { useGalaxy } from "../hooks/useGalaxy";
import { getDecayedSkills, reactivateSkill, type DecayedSkill } from "../services/decay.service";
import { getRoles } from "../services/careerGps.service";
import { getResumePreviewUrl, downloadResumePdf, getResumePreviewHtml, analyzeResume } from "../services/resume.service";
import { getResourcesForSkill, type LearningResource } from "../services/resources.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IngestionStatus = {
  status: "queued" | "processing" | "completed" | "failed" | "rate_limited" | "not_started";
  repositoryCount?: number;
  skillsFound?: number;
  manualIngestionAvailableAt?: string;
  message?: string;
  error?: string;
};

type DashboardAction = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  cta: string;
  href?: string;
  onClick?: () => void;
};

function formatCooldown(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getRetryAfterAvailableAt(retryAfter?: string) {
  if (!retryAfter) return undefined;

  const retryAfterSeconds = Number(retryAfter);
  if (!Number.isNaN(retryAfterSeconds)) {
    return new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
  }

  const retryAfterDate = Date.parse(retryAfter);
  return Number.isNaN(retryAfterDate) ? undefined : new Date(retryAfterDate).toISOString();
}

function isSkillNode(node: GalaxyNode) {
  return Boolean(
    node.labels?.includes("Skill") ||
    node.category ||
    typeof node.confidence === "number" ||
    typeof node.proficiency === "number" ||
    typeof node.endorsementCount === "number"
  );
}

function getConfidence(node: GalaxyNode) {
  return Number(node.confidence ?? node.proficiency ?? 0);
}

export function Dashboard() {
  const { userId, fullName, publicHandle, role, setUser } = useAuthStore();
  const [selectedNode, setSelectedNode] = useState<GalaxyNode | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [statusPollVersion, setStatusPollVersion] = useState(0);
  const [manualCooldownUntil, setManualCooldownUntil] = useState<string>();
  const [decayedSkills, setDecayedSkills] = useState<DecayedSkill[]>([]);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeModalTab, setResumeModalTab] = useState<"export" | "ats">("export");
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    id: string;
    atsScore: number;
    matchedSkills: string[];
    gapSkills: string[];
    roleTitle: string;
  } | null>(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [selectedGapSkill, setSelectedGapSkill] = useState<string | null>(null);
  const [gapSkillResources, setGapSkillResources] = useState<LearningResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    if (!showResumeModal) return;

    let active = true;
    setLoadingPreview(true);

    const loadPreview = async () => {
      try {
        const html = await getResumePreviewHtml(selectedRoleId || undefined);
        if (active) {
          setPreviewHtml(html);
        }
      } catch (err) {
        console.error("Failed to load resume preview:", err);
        if (active) {
          setPreviewHtml("<p style='padding: 2rem; color: #ef4444; font-weight: 600; text-align: center;'>Failed to load preview. Please try logging in again.</p>");
        }
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [showResumeModal, selectedRoleId, previewVersion]);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  const handleExportPdf = async () => {
    setDownloading(true);
    try {
      await downloadResumePdf(
        selectedRoleId || undefined,
        `resume_${publicHandle || fullName || "export"}.pdf`
      );
    } catch (err) {
      console.error("Failed to export resume PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const [extractedText, setExtractedText] = useState("");

  const handleResumePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setPdfFile(file);
    setParsingPdf(true);
    setAnalysisResult(null);
    setSelectedGapSkill(null);
    setGapSkillResources([]);

    try {
      const pdfjsUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs";
      const pdfjs: any = await import(/* @vite-ignore */ pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        text += pageText + "\n";
      }

      if (!text.trim()) {
        throw new Error("No readable text found in PDF. The PDF might contain scanned images without OCR.");
      }

      setExtractedText(text);

      if (selectedRoleId) {
        await runResumeAnalysis(text, selectedRoleId);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse PDF: " + (err.message || err));
      setPdfFile(null);
    } finally {
      setParsingPdf(false);
    }
  };

  const runResumeAnalysis = async (textToAnalyze: string, roleId: string) => {
    if (!textToAnalyze || !roleId) return;
    setAnalyzingResume(true);
    try {
      const result = await analyzeResume(textToAnalyze, roleId);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      alert("Failed to analyze resume: " + (err.response?.data?.error?.message || err.message || err));
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleFetchResources = async (skillName: string) => {
    setSelectedGapSkill(skillName);
    setLoadingResources(true);
    try {
      const res = await getResourcesForSkill(skillName);
      setGapSkillResources(res);
    } catch (err) {
      console.error("Failed to load skill resources:", err);
    } finally {
      setLoadingResources(false);
    }
  };


  const fetchDecayed = async () => {
    try {
      const list = await getDecayedSkills();
      setDecayedSkills(list);
    } catch (err) {
      console.error("Failed to fetch decayed skills:", err);
    }
  };

  const handleReactivate = async (skillName: string) => {
    try {
      await reactivateSkill(skillName);
      await refresh();
      await fetchDecayed();
    } catch (err) {
      console.error(`Failed to reactivate ${skillName}:`, err);
    }
  };

  const navigate = useNavigate();
  const galaxy = useGalaxy({ studentId: role === "student" ? userId : undefined });
  const { nodes, links, loading: loadingGalaxy, error: galaxyError, refresh } = galaxy;
  const skillNodes = useMemo(() => nodes.filter(isSkillNode), [nodes]);
  const activeSkills = skillNodes.filter((node) => node.name && !node.dormant).length;
  const dormantSkills = skillNodes.filter((node) => node.dormant).length;
  const endorsedSkills = skillNodes.filter((node) => node.endorsed).length;
  const weakSkills = skillNodes.filter((node) => !node.dormant && getConfidence(node) > 0 && getConfidence(node) < 0.65).length;
  const noEvidenceSkills = skillNodes.filter((node) => !node.endorsed && (!node.sourceRepos || node.sourceRepos.length === 0)).length;
  const projectEvidenceSkills = skillNodes.filter((node) => (node.sourceRepos?.length ?? 0) > 0).length;
  const highConfidenceSkills = skillNodes.filter((node) => getConfidence(node) >= 0.8).length;
  const cooldownUntil = manualCooldownUntil
    ? Date.parse(manualCooldownUntil)
    : undefined;
  const cooldownMs = cooldownUntil && cooldownUntil > now ? cooldownUntil - now : 0;
  const scanDisabled = ingesting || cooldownMs > 0;
  const evidenceScore = skillNodes.length > 0
    ? Math.round(((endorsedSkills * 0.45) + (projectEvidenceSkills * 0.35) + (highConfidenceSkills * 0.2)) / skillNodes.length * 100)
    : 0;
  const healthScore = skillNodes.length > 0
    ? Math.max(0, Math.round(((activeSkills - weakSkills * 0.5 - dormantSkills) / skillNodes.length) * 100))
    : 0;
  const recentSkillEvidence = useMemo(() => (
    skillNodes
      .filter((node) => node.name)
      .sort((a, b) => {
        const repoDelta = (b.sourceRepos?.length ?? 0) - (a.sourceRepos?.length ?? 0);
        if (repoDelta !== 0) return repoDelta;
        return getConfidence(b) - getConfidence(a);
      })
      .slice(0, 5)
  ), [skillNodes]);
  const actionItems = useMemo<DashboardAction[]>(() => {
    const actions: DashboardAction[] = [];

    if (skillNodes.length === 0) {
      actions.push({
        title: "Scan GitHub to build your skill graph",
        detail: "No usable skill evidence is mapped yet.",
        priority: "high",
        cta: "Scan now",
        onClick: handleIngest
      });
    }

    if (weakSkills > 0) {
      actions.push({
        title: "Strengthen weak skills",
        detail: `${weakSkills} active skills have low confidence evidence.`,
        priority: "medium",
        cta: "Inspect graph"
      });
    }

    if (noEvidenceSkills > 0) {
      actions.push({
        title: "Add evidence or endorsements",
        detail: `${noEvidenceSkills} skills lack repo or peer proof.`,
        priority: "medium",
        cta: "Request endorsements",
        href: "/notifications"
      });
    }

    if (dormantSkills > 0) {
      actions.push({
        title: "Revive dormant skills",
        detail: `${dormantSkills} skills appear inactive and may decay.`,
        priority: "low",
        cta: "Plan refresh"
      });
    }

    return actions.slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dormantSkills, noEvidenceSkills, skillNodes.length, weakSkills]);

  useEffect(() => {
    void getCurrentUser().then((user) => {
      console.log("[Dashboard] Got user:", user);
      setUser(user);
    }).catch(() => {
      window.location.href = "/login";
    });
  }, [setUser]);

  useEffect(() => {
    if (userId && role) {
      if (role === "admin" || role === "professor" || role === "superadmin") {
        navigate("/admin");
      }
    }
  }, [userId, role, navigate]);

  useEffect(() => {
    if (userId && role === "student" && !loadingGalaxy && nodes.length === 0 && !galaxyError) {
      navigate("/onboarding");
    }
  }, [userId, role, loadingGalaxy, nodes.length, galaxyError, navigate]);

  useEffect(() => {
    if (userId && role === "student") {
      void fetchDecayed();
    }
  }, [userId, role]);

  useEffect(() => {
    if (!userId || role !== "student") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollStatus = async () => {
      try {
        const status = await getIngestionStatus(userId);
        if (cancelled) return;

        if (status.manualIngestionAvailableAt) {
          setManualCooldownUntil(status.manualIngestionAvailableAt);
        }

        setIngestionStatus((current) => {
          const currentCooldownUntil = current?.manualIngestionAvailableAt
            ? Date.parse(current.manualIngestionAvailableAt)
            : undefined;
          const currentCooldownActive = currentCooldownUntil ? currentCooldownUntil > Date.now() : false;

          if (current?.status === "rate_limited" && currentCooldownActive && (status.status === "queued" || status.status === "processing")) {
            return current;
          }

          return status;
        });

        if (status.status === "queued" || status.status === "processing") {
          setIngesting(true);
          timeoutId = setTimeout(pollStatus, 3000);
        } else if (status.status === "completed") {
          setIngesting(false);
          await refresh();
        } else {
          setIngesting(false);
        }
      } catch (error) {
        console.error("Failed to fetch ingestion status:", error);
        if (!cancelled) setIngesting(false);
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, refresh, statusPollVersion]);

  useEffect(() => {
    if (cooldownMs <= 0) return;

    const intervalId = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(intervalId);
  }, [cooldownMs]);

  useEffect(() => {
    if (manualCooldownUntil && cooldownMs <= 0) {
      setManualCooldownUntil(undefined);
    }
  }, [cooldownMs, manualCooldownUntil]);

  async function handleIngest() {
    if (cooldownMs > 0) {
      setIngestionStatus((current) => ({
        ...current,
        status: "rate_limited",
        message: `Scan is available again in ${formatCooldown(cooldownMs)}.`
      }));
      return;
    }

    setIngesting(true);
    setIngestionStatus(null);
    try {
      const result = await triggerIngestion();
      const nextManualCooldownUntil =
        result.manualIngestionAvailableAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

      setManualCooldownUntil(nextManualCooldownUntil);
      setIngestionStatus({
        status: result.status,
        repositoryCount: result.repositoryCount,
        skillsFound: result.skillsFound,
        manualIngestionAvailableAt: nextManualCooldownUntil
      });
      setStatusPollVersion((version) => version + 1);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 429) {
        const nextManualCooldownUntil =
          error.response.data?.data?.manualIngestionAvailableAt ??
          getRetryAfterAvailableAt(error.response.headers["retry-after"]) ??
          new Date(Date.now() + 60 * 60 * 1000).toISOString();

        setManualCooldownUntil(nextManualCooldownUntil);
        setIngestionStatus({
          status: "rate_limited",
          manualIngestionAvailableAt: nextManualCooldownUntil,
          message: error.response.data?.error?.message ?? "Please wait before triggering another scan."
        });
        setIngesting(false);
        return;
      }

      setIngestionStatus({
        status: "failed",
        error: error instanceof Error ? error.message : "Ingestion failed"
      });
      setIngesting(false);
    }
  }

  if (role === "alumni") {
    return <AlumniDashboard />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1720px] flex-col gap-4 pb-20 lg:pb-4">
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Skill workspace
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
            {fullName ? `${fullName}'s skills` : "Your skills"}
          </h1>
          {publicHandle && (
            <p className="mt-1 text-sm text-muted-foreground">Public galaxy: /galaxy/{publicHandle}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search skills"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-9 border-input bg-background pl-8"
            />
          </div>

          <Button
            onClick={() => {
              void fetchRoles();
              setShowResumeModal(true);
            }}
            variant="outline"
            size="lg"
            className="gap-2 border-border text-foreground hover:bg-accent"
          >
            <Sparkles className="size-4 text-primary" />
            AI Resume Exporter
          </Button>

          <Button
            onClick={handleIngest}
            disabled={scanDisabled}
            size="lg"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {ingesting ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {ingesting
              ? "Scanning..."
              : cooldownMs > 0
              ? `Scan in ${formatCooldown(cooldownMs)}`
              : "Scan GitHub"}
          </Button>
        </div>
      </header>

      {(ingestionStatus || galaxyError) && (
        <IngestionStatusBanner
          status={ingestionStatus?.status}
          message={ingestionStatus?.message}
          error={ingestionStatus?.error || galaxyError}
          repositoryCount={ingestionStatus?.repositoryCount}
          skillsFound={ingestionStatus?.skillsFound}
        />
      )}

      {decayedSkills.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-500/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-semibold text-amber-800">
                Decayed Skills Detected
              </h2>
              <p className="mt-1 text-sm text-amber-700">
                You have {decayedSkills.length} skills that haven't registered commit activity in the past 12 months. Their proficiency has decayed by 15%, and they are marked as dormant.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {decayedSkills.map((ds) => (
              <div
                key={ds.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm text-xs font-medium text-foreground"
              >
                <span>{ds.skillName} ({(ds.currentWeight * 100).toFixed(0)}%)</span>
                <button
                  onClick={() => handleReactivate(ds.skillName)}
                  className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl border-border bg-card py-3 shadow-sm">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Skills mapped</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{nodes.length}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <GitBranch className="size-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border bg-card py-3 shadow-sm">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active skills</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{activeSkills}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Sparkles className="size-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border bg-card py-3 shadow-sm">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Endorsed</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{endorsedSkills}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <ShieldCheck className="size-4" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="size-4 text-primary" />
              Next actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2">
            {actionItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-foreground">No urgent action</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Your graph has enough evidence for now. Keep building and scan after meaningful work.</p>
              </div>
            ) : (
              actionItems.map((action) => (
                <div key={action.title} className="rounded-xl border border-border bg-muted/40 p-3 hover:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={
                        action.priority === "high"
                          ? "rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                          : action.priority === "medium"
                          ? "rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600"
                          : "rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                      }>
                        {action.priority}
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{action.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.detail}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full justify-between"
                    onClick={() => {
                      if (action.onClick) action.onClick();
                      if (action.href) window.location.href = action.href;
                    }}
                    disabled={action.onClick === handleIngest && scanDisabled}
                  >
                    {action.cta}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="size-4 text-emerald-600" />
              Skill health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-foreground">{healthScore}%</p>
                <p className="mt-1 text-sm text-muted-foreground">active, current, and confident</p>
              </div>
              {healthScore < 60 ? (
                <AlertTriangle className="size-8 text-amber-600" />
              ) : (
                <CheckCircle2 className="size-8 text-emerald-600" />
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/45 p-2">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-semibold text-foreground">{activeSkills}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-2">
                <p className="text-xs text-muted-foreground">Weak</p>
                <p className="text-lg font-semibold text-foreground">{weakSkills}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-2">
                <p className="text-xs text-muted-foreground">Dormant</p>
                <p className="text-lg font-semibold text-foreground">{dormantSkills}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="size-4 text-primary" />
              Evidence quality
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-foreground">{evidenceScore}%</p>
                <p className="mt-1 text-sm text-muted-foreground">weighted repo, endorsement, confidence proof</p>
              </div>
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Repo-backed skills</span>
                <span className="font-semibold text-foreground">{projectEvidenceSkills}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Peer-endorsed skills</span>
                <span className="font-semibold text-foreground">{endorsedSkills}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">No evidence</span>
                <span className="font-semibold text-foreground">{noEvidenceSkills}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <History className="size-4 text-amber-600" />
              Recent skill changes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="rounded-xl border border-border bg-muted/45 p-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {ingestionStatus?.status === "completed"
                    ? "Latest scan completed"
                    : ingestionStatus?.status === "processing" || ingestionStatus?.status === "queued"
                    ? "Scan in progress"
                    : "No scan update in this session"}
                </p>
              </div>
              {(ingestionStatus?.repositoryCount || ingestionStatus?.skillsFound) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ingestionStatus.repositoryCount ?? 0} repos checked, {ingestionStatus.skillsFound ?? 0} skills found.
                </p>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {recentSkillEvidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">Scan GitHub to see recently evidenced skills.</p>
              ) : (
                recentSkillEvidence.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.sourceRepos?.length ?? 0} repo signals</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">{Math.round(getConfidence(skill) * 100)}%</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 min-h-[640px] overflow-hidden rounded-xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-sm font-semibold text-foreground">Skill galaxy</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <SkillGalaxy
              data={{ nodes, links }}
              onSelect={setSelectedNode}
              searchFilter={searchFilter}
            />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card py-0 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)]">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-sm font-semibold text-foreground">Inspector</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[420px] overflow-auto p-4">
            <SkillDetailPanel
              node={selectedNode}
              links={links}
              nodes={nodes}
              decayedSkills={decayedSkills}
            />
          </CardContent>
        </Card>
      </section>

      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Modal Header & Tabs */}
            <div className="border-b border-border bg-card">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">AI Resume Assistant</h3>
                  <p className="text-xs text-muted-foreground">Export your resume or test it against an ATS screener.</p>
                </div>
                <button
                  onClick={() => setShowResumeModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex gap-4 px-6 border-t border-border/80">
                <button
                  onClick={() => setResumeModalTab("export")}
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
                    resumeModalTab === "export"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AI Resume Exporter
                </button>
                <button
                  onClick={() => setResumeModalTab("ats")}
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
                    resumeModalTab === "ats"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ATS Upload & Analyzer
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {resumeModalTab === "export" ? (
              <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6 md:flex-row">
                {/* Left Side: Controls */}
                <div className="flex w-full flex-col gap-4 md:w-80">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Target Role</label>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      style={{ color: "#17202a", backgroundColor: "white" }}
                      className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 text-sm shadow-sm outline-none focus:border-primary"
                    >
                      <option value="" style={{ color: "#17202a", backgroundColor: "white" }}>General (No target role optimization)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id} style={{ color: "#17202a", backgroundColor: "white" }}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-xs text-primary">
                    <p className="font-semibold">How it works:</p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4">
                      <li>Fetches your technical skills, active confidence weights, and project portfolio.</li>
                      <li>Calculates a real-time weighted ATS match score for the selected industry role.</li>
                      <li>Re-orders technical skills to prioritize required keywords first, boosting parser match rates.</li>
                      <li>Generates a clean, single-column, standard A4 PDF formatted for compliance with major ATS screeners.</li>
                    </ul>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border">
                    <Button
                      onClick={handleExportPdf}
                      disabled={downloading}
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {downloading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Export PDF Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Right Side: Live HTML Preview */}
                <div className="flex flex-1 flex-col rounded-xl border border-border bg-muted/45 overflow-hidden">
                  <div className="bg-card px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground flex justify-between items-center">
                    <span>Live Document Preview (A4)</span>
                    <button
                      onClick={() => setPreviewVersion((v) => v + 1)}
                      className="hover:text-primary"
                      title="Refresh Preview"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                  {loadingPreview ? (
                    <div className="flex flex-1 flex-col items-center justify-center bg-card gap-2 text-muted-foreground text-xs">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading live preview...</span>
                    </div>
                  ) : (
                    <iframe
                      id="resume-preview-iframe"
                      srcDoc={previewHtml}
                      className="w-full flex-1 border-0 bg-white"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
                <div className="grid gap-6 md:grid-cols-[1fr_320px] h-full overflow-hidden">
                  {/* Left side: Upload & Score Results */}
                  <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Select Target Role</label>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => {
                          setSelectedRoleId(e.target.value);
                          if (extractedText && e.target.value) {
                            void runResumeAnalysis(extractedText, e.target.value);
                          }
                        }}
                        style={{ color: "#17202a", backgroundColor: "white" }}
                        className="w-full rounded-lg border border-input px-3 py-2 text-sm shadow-sm outline-none focus:border-primary"
                      >
                        <option value="" style={{ color: "#17202a", backgroundColor: "white" }}>-- Choose Target Role --</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id} style={{ color: "#17202a", backgroundColor: "white" }}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Upload Current Resume (PDF)</label>
                      <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/45 p-6 text-center transition-all hover:bg-card hover:border-primary">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleResumePdfUpload}
                          disabled={parsingPdf || analyzingResume}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        {parsingPdf ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="size-8 animate-spin text-primary" />
                            <p className="text-sm font-semibold text-foreground">Parsing resume PDF contents...</p>
                          </div>
                        ) : pdfFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="size-8 text-emerald-600" />
                            <p className="text-sm font-semibold text-foreground">{pdfFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <svg className="size-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-semibold text-foreground">Upload resume PDF</p>
                            <p className="text-xs text-muted-foreground">Drag & drop or browse files</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {analyzingResume && (
                      <div className="flex items-center justify-center gap-2 py-8">
                        <RefreshCw className="size-5 animate-spin text-primary" />
                        <span className="text-sm font-medium text-foreground">Analyzing resume keywords...</span>
                      </div>
                    )}

                    {analysisResult && (
                      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-foreground">Analysis Results</h4>
                            <p className="text-xs text-muted-foreground">Matched against <strong className="text-foreground">{analysisResult.roleTitle}</strong></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-[10px] font-semibold text-muted-foreground">ATS Match Score</span>
                              <div className="text-xl font-black text-primary">{analysisResult.atsScore}%</div>
                            </div>
                            <div className="relative h-10 w-10 flex-shrink-0">
                              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-muted/30"
                                  strokeWidth="4"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-primary"
                                  strokeDasharray={`${analysisResult.atsScore}, 100`}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Matched Keywords ({analysisResult.matchedSkills.length})</h5>
                          {analysisResult.matchedSkills.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No keywords matched yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.matchedSkills.map((s) => (
                                <span key={s} className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Missing Gap Keywords ({analysisResult.gapSkills.length})</h5>
                          {analysisResult.gapSkills.length === 0 ? (
                            <p className="text-xs text-emerald-600 font-semibold">Perfect! No gaps identified.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.gapSkills.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleFetchResources(s)}
                                  className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                                    selectedGapSkill === s
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  }`}
                                >
                                  + {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side: Learning Recommendations */}
                  <div className="rounded-xl border border-border bg-card p-4 flex flex-col overflow-hidden max-h-[380px]">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                      <Sparkles className="size-3.5 text-primary" />
                      Recapture Recommendations
                    </h4>
                    <div className="flex-1 overflow-y-auto mt-2">
                      {selectedGapSkill ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-muted-foreground">Resources for:</span>
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">{selectedGapSkill}</span>
                          </div>
                          {loadingResources ? (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground">
                              <RefreshCw className="size-3.5 animate-spin text-primary" />
                              <span className="text-[10px]">Loading suggestions...</span>
                            </div>
                          ) : gapSkillResources.length === 0 ? (
                            <div className="text-center py-8 text-[10px] text-muted-foreground italic bg-card rounded-lg border border-border">
                              No direct online resources configured.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {gapSkillResources.map((res) => (
                                <a
                                  key={res.id}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-2 rounded-lg border border-border bg-card hover:border-primary transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-xs font-bold text-foreground line-clamp-1">{res.title}</span>
                                    {res.isUniversityApproved && (
                                      <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-bold text-primary flex-shrink-0">
                                        Approved
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[8px] text-muted-foreground">
                                    <span>{res.provider || "Self-Study"}</span>
                                    {res.rating && <span>★ {res.rating.toFixed(1)}</span>}
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                          <Target className="size-6 text-muted/40 mb-1.5" />
                          <p className="text-[10px] leading-relaxed">Select a missing gap keyword to view course recommendations.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
