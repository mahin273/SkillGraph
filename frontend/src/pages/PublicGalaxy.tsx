import { useParams } from "react-router-dom";
import { SkillGalaxy } from "../components/galaxy/SkillGalaxy";
import { useGalaxy } from "../hooks/useGalaxy";

export function PublicGalaxy() {
  const { handle } = useParams();
  const galaxy = useGalaxy({ handle });

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-950">@{handle}'s public Skill Galaxy</h1>
        {galaxy.error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{galaxy.error}</div> : null}
        <SkillGalaxy data={{ nodes: galaxy.nodes, links: galaxy.links }} readOnly />
      </div>
    </main>
  );
}
