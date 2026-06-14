import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import type { GalaxyData, GalaxyNode } from "../../services/graph.service";
import { OnboardingEmptyState } from "./OnboardingEmptyState";
import { SkillTooltip } from "./SkillTooltip";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

type SkillGalaxyProps = {
  data?: GalaxyData;
  readOnly?: boolean;
  onSelect?: (node: GalaxyNode) => void;
  searchFilter?: string;
};

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  Languages: "#3b82f6", // blue-500
  Frameworks: "#22c55e", // green-500
  DevOps: "#ef4444", // red-500
  Databases: "#eab308", // yellow-500
  Cloud: "#a855f7", // purple-500
  "ML/AI": "#ec4899", // pink-500
  Testing: "#06b6d4", // cyan-500
  Uncategorized: "#71717a", // zinc-500
};

const GRAPH_HEIGHT = 560;

export function SkillGalaxy({ data = { nodes: [], links: [] }, readOnly = false, onSelect, searchFilter = "" }: SkillGalaxyProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<GalaxyNode | null>(null);
  const [containerWidth, setContainerWidth] = useState(1);

  // Measure container width — use layout effect for synchronous measurement before paint
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };

    measure();

    // Backup measurement after layout settles
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 200);

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // When containerWidth changes, manually resize the Three.js renderer
  // as a fallback in case ForceGraph3D doesn't respond to prop changes
  useEffect(() => {
    if (containerWidth > 1 && fgRef.current) {
      try {
        const renderer = fgRef.current.renderer?.();
        if (renderer) {
          renderer.setSize(containerWidth, GRAPH_HEIGHT);
        }
      } catch {
        // renderer() may not be available yet
      }
    }
  }, [containerWidth]);

  const getCategoryColor = (category?: string): string => {
    return CATEGORY_COLORS[category ?? "Uncategorized"] ?? CATEGORY_COLORS.Uncategorized;
  };

  // Custom 3D Object Drawer for Nodes
  const drawNode = useCallback((node: any) => {
    const group = new THREE.Group();

    // 1. Determine size based on node type
    let size = 4;
    if (node.handle) {
      size = 9; // Student node
    } else if (node.fullName) {
      size = 7; // Project node
    } else {
      const proficiency = node.proficiency ?? node.confidence ?? 0.5;
      size = 4 + proficiency * 3.5; // Skill node
    }

    // 2. Determine color based on node type
    let colorStr = "#71717a";
    if (node.handle) {
      colorStr = "#18181b"; // dark zinc for students
    } else if (node.fullName) {
      colorStr = "#ea580c"; // orange for projects
    } else {
      colorStr = getCategoryColor(node.category);
    }

    // 3. Search filter matching
    const lowerFilter = searchFilter.trim().toLowerCase();
    const labelText = node.name ?? node.fullName ?? node.handle ?? node.id ?? "";
    const matchesSearch = !lowerFilter || labelText.toLowerCase().includes(lowerFilter);
    const isDormant = node.name && !node.handle && !node.fullName && node.dormant;

    // Apply opacities based on filtering / active status
    let opacity = 1.0;
    if (!matchesSearch) {
      opacity = 0.1;
    } else if (isDormant) {
      opacity = 0.35;
    }

    // 4. Create Node Sphere
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorStr),
      transparent: true,
      opacity: opacity,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // 5. Add checkmark badge for endorsed skills
    if (node.endorsed === true && matchesSearch) {
      const badgeGeom = new THREE.SphereGeometry(size * 0.35, 8, 8);
      const badgeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // emerald-500
      const badge = new THREE.Mesh(badgeGeom, badgeMat);
      badge.position.set(size * 0.7, size * 0.7, 0);
      group.add(badge);
    }

    // 6. Draw floating text label
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      canvas.width = 256;
      canvas.height = 64;
      context.font = "bold 24px sans-serif";
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(labelText, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: matchesSearch ? 0.95 : 0.15,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(0, size + 5, 0);
      sprite.scale.set(18, 4.5, 1);
      group.add(sprite);
    }

    return group;
  }, [searchFilter]);

  const handleNodeClick = (node: any) => {
    if (!fgRef.current) return;

    // Center camera on clicked node with smooth animation
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    const distance = 80;
    const dist = Math.hypot(x, y, z);
    const distRatio = dist > 0 ? 1 + distance / dist : 1;

    fgRef.current.cameraPosition(
      { x: x * distRatio, y: y * distRatio, z: z * distRatio },
      node, // lookAt target node
      2000 // animation transition duration (ms)
    );

    if (!readOnly && onSelect) {
      onSelect(node as GalaxyNode);
    }
  };

  if (data.nodes.length === 0) {
    return (
      <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-border bg-muted/45 p-6 text-center text-muted-foreground">
        <OnboardingEmptyState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-border bg-[#09090b]"
      style={{ width: "100%", height: GRAPH_HEIGHT }}
    >
      {containerWidth > 1 && (
        <ForceGraph3D
          ref={fgRef}
          width={containerWidth}
          height={GRAPH_HEIGHT}
          graphData={data}
          backgroundColor="#09090b"
          nodeThreeObject={drawNode}
          linkWidth={(link: any) => (link.type === "KNOWS" ? 1.5 : 0.8)}
          linkColor={() => "rgba(255, 255, 255, 0.12)"}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeHover={(node) => setHovered(node as GalaxyNode | null)}
          onNodeClick={handleNodeClick}
          enableNodeDrag={!readOnly}
        />
      )}
      <SkillTooltip node={hovered} />
    </div>
  );
}
