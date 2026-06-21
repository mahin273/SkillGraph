import { useCallback, useEffect, useState } from "react";
import { GalaxyData, getPublicGalaxy, getStudentGalaxy } from "../services/graph.service";

export function useGalaxy(target: { studentId?: string; handle?: string }) {
  const [data, setData] = useState<GalaxyData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(Boolean(target.studentId || target.handle));
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!target.studentId && !target.handle) return;
    setLoading(true);
    setError(undefined);
    try {
      const galaxy = target.handle ? await getPublicGalaxy(target.handle) : await getStudentGalaxy(target.studentId!);
      setData(galaxy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load galaxy");
    } finally {
      setLoading(false);
    }
  }, [target.handle, target.studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...data, loading, error, refresh };
}
