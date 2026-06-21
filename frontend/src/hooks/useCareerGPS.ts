import { useState, useEffect } from "react";
import { getCareerGPS, saveCareerGPS, type CareerGPSData } from "../services/careerGps.service";

interface UseCareerGPSProps {
  studentId: string | null;
  targetRoleId: string | null;
}

export function useCareerGPS({ studentId, targetRoleId }: UseCareerGPSProps) {
  const [data, setData] = useState<CareerGPSData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !targetRoleId) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchGPS = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const gpsData = await getCareerGPS(studentId, targetRoleId);
        if (!cancelled) {
          setData(gpsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load career GPS");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchGPS();

    return () => {
      cancelled = true;
    };
  }, [studentId, targetRoleId]);

  const save = async () => {
    if (!data) return;

    try {
      await saveCareerGPS({
        studentId: data.studentId,
        targetRoleId: data.targetRole.id,
        completionPercentage: data.completionPercentage,
        estimatedWeeks: data.estimatedWeeks,
        missingSkills: data.missingSkills,
        roadmap: data.roadmap
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to save career GPS");
    }
  };

  return {
    data,
    loading,
    error,
    save
  };
}
