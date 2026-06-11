import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { GalaxyData, GalaxyNode } from "../../services/graph.service";
import { OnboardingEmptyState } from "./OnboardingEmptyState";
import { SkillTooltip } from "./SkillTooltip";
import type { WorkerMessage, WorkerResponse } from "./GalaxyWorker";

type SkillGalaxyProps = {
  data?: GalaxyData;
  readOnly?: boolean;
  onSelect?: (node: GalaxyNode) => void;
  searchFilter?: string;
};

function labelFor(node: GalaxyNode) {
  return node.name ?? node.fullName ?? node.handle ?? node.id ?? "";
}

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  Languages: "#2563eb", // blue-600
  Frameworks: "#16a34a", // green-600
  DevOps: "#dc2626", // red-600
  Databases: "#ca8a04", // yellow-600
  Cloud: "#7c3aed", // purple-600
  "ML/AI": "#db2777", // pink-600
  Testing: "#0891b2", // cyan-600
  Uncategorized: "#71717a", // zinc-500
};

function getCategoryColor(category?: string): string {
  return CATEGORY_COLORS[category ?? "Uncategorized"] ?? CATEGORY_COLORS.Uncategorized;
}

export function SkillGalaxy({ data = { nodes: [], links: [] }, readOnly = false, onSelect, searchFilter = "" }: SkillGalaxyProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [hovered, setHovered] = useState<GalaxyNode | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement || data.nodes.length === 0) return;

    const width = svgElement.clientWidth || 760;
    const height = 520;
    const nodes = data.nodes.map((node) => ({ ...node }));
    const links = data.links.map((link) => ({ ...link }));

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    const root = svg.append("g");
    
    // Zoom and pan support
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.35, 3])
        .on("zoom", (event) => {
          root.attr("transform", event.transform.toString());
        })
    );

    // Render links
    const link = root
      .append("g")
      .attr("stroke", "#e4e4e7") // zinc-200
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => (d.type === "KNOWS" ? 2.0 : 1.2));

    // Render nodes
    const node = root
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", readOnly ? "default" : "pointer")
      .on("mouseenter", (_event, d) => setHovered(d))
      .on("mouseleave", () => setHovered(null))
      .on("click", (_event, d) => onSelect?.(d));

    // Render circles sized by proficiency, colored by category, with opacity for dormant
    node
      .append("circle")
      .attr("r", (d) => {
        // Student/Project nodes have different sizing
        if (d.handle) return 30;
        if (d.fullName) return 22;
        // Skill nodes sized by proficiency
        const proficiency = d.proficiency ?? d.confidence ?? 0.5;
        return 18 + Math.round(proficiency * 10);
      })
      .attr("fill", (d) => {
        // Student nodes
        if (d.handle) return "#18181b"; // zinc-900
        // Project nodes
        if (d.fullName) return "#ea580c"; // orange-600
        // Skill nodes colored by category
        return getCategoryColor(d.category);
      })
      .attr("opacity", (d) => {
        // Skill nodes: dormant = 0.35, active = 1.0
        if (d.name && !d.handle && !d.fullName) {
          return d.dormant ? 0.35 : 1.0;
        }
        return 1.0;
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Render checkmark badge for endorsed skills
    node
      .filter((d) => d.endorsed === true)
      .append("circle")
      .attr("cx", 12)
      .attr("cy", -12)
      .attr("r", 8)
      .attr("fill", "#10b981")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    node
      .filter((d) => d.endorsed === true)
      .append("text")
      .attr("x", 12)
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .text("✓");

    // Render labels
    node
      .append("text")
      .text(labelFor)
      .attr("text-anchor", "middle")
      .attr("dy", 42)
      .attr("fill", "#09090b") // zinc-950
      .attr("font-size", 10.5)
      .attr("font-weight", 500);

    // Apply search filter
    if (searchFilter) {
      const lowerFilter = searchFilter.toLowerCase();
      node.attr("opacity", (d) => {
        const label = labelFor(d).toLowerCase();
        const matches = label.includes(lowerFilter);
        return matches ? 1.0 : 0.1;
      });
    }

    // Initialize Web Worker for force simulation
    const worker = new Worker(new URL("./GalaxyWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === "tick") {
        const positions = new Map(event.data.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
        setNodePositions(positions);

        // Update link positions
        link
          .attr("x1", (d: any) => {
            const sourceId = typeof d.source === "string" ? d.source : d.source.id;
            return positions.get(sourceId)?.x ?? 0;
          })
          .attr("y1", (d: any) => {
            const sourceId = typeof d.source === "string" ? d.source : d.source.id;
            return positions.get(sourceId)?.y ?? 0;
          })
          .attr("x2", (d: any) => {
            const targetId = typeof d.target === "string" ? d.target : d.target.id;
            return positions.get(targetId)?.x ?? 0;
          })
          .attr("y2", (d: any) => {
            const targetId = typeof d.target === "string" ? d.target : d.target.id;
            return positions.get(targetId)?.y ?? 0;
          });

        // Update node positions
        node.attr("transform", (d) => {
          const pos = positions.get(d.id);
          return `translate(${pos?.x ?? 0},${pos?.y ?? 0})`;
        });
      }
    };

    // Send init message to worker
    const workerNodes = nodes.map((n) => ({
      id: n.id,
      proficiency: n.proficiency ?? n.confidence ?? 0.5,
    }));
    const workerLinks = links.map((l) => ({
      source: typeof l.source === "string" ? l.source : l.source.id,
      target: typeof l.target === "string" ? l.target : l.target.id,
      type: l.type,
    }));

    worker.postMessage({
      type: "init",
      nodes: workerNodes,
      links: workerLinks,
      width,
      height,
    } as WorkerMessage);

    return () => {
      worker.postMessage({ type: "stop" } as WorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [data, onSelect, readOnly, searchFilter]);

  if (data.nodes.length === 0) {
    return (
      <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-border bg-muted/45 p-6 text-center text-muted-foreground">
        <OnboardingEmptyState />
      </div>
    );
  }

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-xl border border-border bg-card">
      <svg ref={svgRef} className="h-[560px] w-full" role="img" aria-label="Skill Galaxy force graph" />
      <SkillTooltip node={hovered} />
    </div>
  );
}
