import type { GalaxyNode, GalaxyLink } from "../../services/graph.service";
import type { DecayedSkill } from "../../services/decay.service";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ExternalLink,
  AlertTriangle,
  Layers,
  GitFork,
} from "lucide-react";

interface SkillDetailPanelProps {
  node: GalaxyNode | null;
  links?: GalaxyLink[];
  nodes?: GalaxyNode[];
  decayedSkills?: DecayedSkill[];
}

const getNodeId = (ref: string | { id: string }) =>
  typeof ref === "string" ? ref : ref.id;

function parseNeo4jDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  try {
    if (typeof dateVal === "string" || typeof dateVal === "number") {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateVal === "object") {
      // Check for Neo4j DateTime object structure { year, month, day, hour, minute, second }
      if ("year" in dateVal && "month" in dateVal && "day" in dateVal) {
        const year = typeof dateVal.year === "object" && dateVal.year !== null ? (dateVal.year.low ?? dateVal.year) : dateVal.year;
        const month = typeof dateVal.month === "object" && dateVal.month !== null ? (dateVal.month.low ?? dateVal.month) : dateVal.month;
        const day = typeof dateVal.day === "object" && dateVal.day !== null ? (dateVal.day.low ?? dateVal.day) : dateVal.day;
        const hour = typeof dateVal.hour === "object" && dateVal.hour !== null ? (dateVal.hour.low ?? dateVal.hour) : (dateVal.hour ?? 0);
        const minute = typeof dateVal.minute === "object" && dateVal.minute !== null ? (dateVal.minute.low ?? dateVal.minute) : (dateVal.minute ?? 0);
        const second = typeof dateVal.second === "object" && dateVal.second !== null ? (dateVal.second.low ?? dateVal.second) : (dateVal.second ?? 0);
        
        const d = new Date(year, month - 1, day, hour, minute, second);
        return isNaN(d.getTime()) ? null : d;
      }
      
      // Fallback for any other object
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    }
  } catch {
    // Ignore error
  }
  return null;
}

function formatDate(dateVal: any): string {
  if (!dateVal) return "N/A";
  const date = parseNeo4jDate(dateVal);
  if (!date) return typeof dateVal === "string" ? dateVal : "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysSince(dateVal: any): number {
  const date = parseNeo4jDate(dateVal);
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function SkillDetailPanel({
  node,
  links = [],
  nodes = [],
  decayedSkills = [],
}: SkillDetailPanelProps) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select a node to inspect
        </p>
      </div>
    );
  }

  // Check if it's a skill node (has proficiency) or repository node
  const isSkill = "proficiency" in node;

  // --- Derived data ---

  // Decay info for this skill
  const decayInfo = isSkill
    ? decayedSkills.find((d) => d.skillName === node.name)
    : undefined;

  // Related skills: skills that share the same project (via BUILT_WITH)
  const projectsUsingSkill = links
    .filter(
      (l) => getNodeId(l.target) === node.id && l.type === "BUILT_WITH"
    )
    .map((l) => getNodeId(l.source));

  const relatedSkillIds = links
    .filter(
      (l) =>
        l.type === "BUILT_WITH" &&
        projectsUsingSkill.includes(getNodeId(l.source)) &&
        getNodeId(l.target) !== node.id
    )
    .map((l) => getNodeId(l.target));

  const relatedSkills = nodes.filter((n) =>
    [...new Set(relatedSkillIds)].includes(n.id)
  );

  // Skills used in this project (for project nodes)
  const skillsUsedInProject = !isSkill
    ? links
        .filter(
          (l) =>
            getNodeId(l.source) === node.id && l.type === "BUILT_WITH"
        )
        .map((l) => {
          const targetId = getNodeId(l.target);
          return nodes.find((n) => n.id === targetId);
        })
        .filter(Boolean) as GalaxyNode[]
    : [];

  // Compute actual updatedAt date
  // For a Skill node: it is the max updatedAt date of all projects using it, falling back to node.updatedAt.
  // For a Project node: it is just node.updatedAt.
  let computedUpdatedAt = node.updatedAt;
  if (isSkill) {
    const projectsUsingThisSkill = links
      .filter((l) => getNodeId(l.target) === node.id && l.type === "BUILT_WITH")
      .map((l) => {
        const sourceId = getNodeId(l.source);
        return nodes.find((n) => n.id === sourceId);
      })
      .filter(Boolean);

    if (projectsUsingThisSkill.length > 0) {
      const dates = projectsUsingThisSkill
        .map((p) => p?.updatedAt)
        .filter(Boolean)
        .map((d) => parseNeo4jDate(d))
        .filter((d): d is Date => d !== null);

      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        computedUpdatedAt = maxDate.toISOString();
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">{node.name}</h2>
        {node.category && (
          <Badge variant="secondary" className="mt-2">
            {node.category}
          </Badge>
        )}
      </div>

      {/* ════════════════════════════════════════════
          SKILL NODE DETAILS
         ════════════════════════════════════════════ */}
      {isSkill && (
        <div className="space-y-4">
          {/* Proficiency */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Proficiency</span>
              <span className="font-medium text-foreground">
                {Math.round((node.proficiency || 0) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${(node.proficiency || 0) * 100}%` }}
              />
            </div>
          </div>

          {/* Confidence */}
          {node.confidence !== undefined && (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium text-foreground">
                  {Math.round(node.confidence * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{ width: `${node.confidence * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={node.dormant ? "secondary" : "default"}>
              {node.dormant ? "Dormant" : "Active"}
            </Badge>
          </div>

          {/* Endorsements */}
          {node.endorsementCount !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Endorsements</span>
              <span className="font-medium text-foreground">
                {node.endorsementCount}
              </span>
            </div>
          )}

          {/* Source Repositories */}
          {node.sourceRepos && node.sourceRepos.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <GitFork className="h-3.5 w-3.5 text-muted-foreground" />
                Used in {node.sourceRepos.length}{" "}
                {node.sourceRepos.length === 1 ? "repository" : "repositories"}
              </h3>
              <div className="space-y-1">
                {node.sourceRepos.slice(0, 5).map((repo) => (
                  <a
                    key={repo}
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {repo}
                  </a>
                ))}
                {node.sourceRepos.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{node.sourceRepos.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── NEW: Decay Info ─── */}
          {decayInfo && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Decay Info
              </h3>
              <div className="space-y-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-700 dark:text-amber-300">
                    Current Weight
                  </span>
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    {Math.round(decayInfo.currentWeight * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width: `${decayInfo.currentWeight * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-700 dark:text-amber-300">
                    Last Active
                  </span>
                  <span className="text-amber-800 dark:text-amber-200">
                    {formatDate(decayInfo.lastActiveDate)}{" "}
                    <span className="text-amber-600 dark:text-amber-400">
                      ({daysSince(decayInfo.lastActiveDate)}d ago)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-700 dark:text-amber-300">
                    Decay Cycles
                  </span>
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    {decayInfo.decayCycles}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─── NEW: Related Skills ─── */}
          {relatedSkills.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                Related Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {relatedSkills.slice(0, 8).map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {s.name}
                  </Badge>
                ))}
                {relatedSkills.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{relatedSkills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── NEW: Last Updated ─── */}
          {computedUpdatedAt && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last updated
              </span>
              <span className="text-foreground">
                {formatDate(computedUpdatedAt)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          PROJECT NODE DETAILS
         ════════════════════════════════════════════ */}
      {!isSkill && (
        <div className="space-y-4">
          {node.language && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Language</span>
              <Badge variant="secondary">{node.language}</Badge>
            </div>
          )}

          {node.fullName && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{node.fullName}</p>
            </div>
          )}

          {node.description && (
            <div>
              <p className="text-sm text-foreground">{node.description}</p>
            </div>
          )}

          {/* ─── NEW: GitHub Link ─── */}
          {node.fullName && (
            <div className="border-t border-border pt-4">
              <a
                href={`https://github.com/${node.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on GitHub
              </a>
            </div>
          )}

          {/* ─── NEW: Skills Used ─── */}
          {skillsUsedInProject.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                Skills Used ({skillsUsedInProject.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skillsUsedInProject.slice(0, 12).map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {s.name}
                  </Badge>
                ))}
                {skillsUsedInProject.length > 12 && (
                  <span className="text-xs text-muted-foreground">
                    +{skillsUsedInProject.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── NEW: Last Updated ─── */}
          {computedUpdatedAt && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last updated
              </span>
              <span className="text-foreground">
                {formatDate(computedUpdatedAt)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
