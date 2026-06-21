import { useState } from "react";
import {
  findMatchmakerCandidates,
  sendMatchInvite,
  type MatchScope,
  type MatchmakerCandidate
} from "../services/matchmaker.service";

export function useMatchmaker() {
  const [candidates, setCandidates] = useState<MatchmakerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findCandidates = async (input: { requiredSkills: string[]; scope: MatchScope }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await findMatchmakerCandidates({
        requiredSkills: input.requiredSkills,
        scope: input.scope,
        limit: 20
      });
      setCandidates(result.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find candidates");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const invite = async (input: {
    candidateId: string;
    projectName: string;
    requiredSkills: string[];
    message?: string;
  }) => {
    await sendMatchInvite(input);
  };

  return {
    candidates,
    loading,
    error,
    findCandidates,
    invite
  };
}
