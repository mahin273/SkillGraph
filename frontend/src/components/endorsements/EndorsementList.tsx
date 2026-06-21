import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Trash2 } from "lucide-react";

interface Endorsement {
  id: string;
  endorserId: string;
  endorsedId: string;
  skillId: string;
  createdAt: string;
  skill: {
    id: string;
    name: string;
  };
  endorser: {
    id: string;
    fullName: string;
    githubHandle: string | null;
    avatarUrl: string | null;
  };
}

interface EndorsementListProps {
  studentId: string;
  canDelete?: boolean;
  currentUserId?: string;
}

export function EndorsementList({ studentId, canDelete = false, currentUserId }: EndorsementListProps) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEndorsements = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/endorsements/${studentId}`);
      setEndorsements(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load endorsements");
      console.error("Failed to fetch endorsements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (endorsementId: string) => {
    if (!confirm("Are you sure you want to remove this endorsement?")) {
      return;
    }

    try {
      await api.delete(`/endorsements/${endorsementId}`);
      setEndorsements(prev => prev.filter(e => e.id !== endorsementId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to delete endorsement");
      console.error("Failed to delete endorsement:", err);
    }
  };

  useEffect(() => {
    fetchEndorsements();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchEndorsements}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (endorsements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No endorsements yet
      </div>
    );
  }

  // Group endorsements by skill
  const endorsementsBySkill = endorsements.reduce((acc, endorsement) => {
    const skillName = endorsement.skill.name;
    if (!acc[skillName]) {
      acc[skillName] = [];
    }
    acc[skillName].push(endorsement);
    return acc;
  }, {} as Record<string, Endorsement[]>);

  return (
    <div className="space-y-6">
      {Object.entries(endorsementsBySkill).map(([skillName, skillEndorsements]) => (
        <div key={skillName} className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {skillName}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({skillEndorsements.length} {skillEndorsements.length === 1 ? "endorsement" : "endorsements"})
            </span>
          </h3>
          <div className="space-y-2">
            {skillEndorsements.map((endorsement) => (
              <div 
                key={endorsement.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {endorsement.endorser.avatarUrl ? (
                    <img 
                      src={endorsement.endorser.avatarUrl}
                      alt={endorsement.endorser.fullName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {endorsement.endorser.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {endorsement.endorser.fullName}
                    </p>
                    {endorsement.endorser.githubHandle && (
                      <p className="text-sm text-gray-500">
                        @{endorsement.endorser.githubHandle}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(endorsement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canDelete && currentUserId === endorsement.endorserId && (
                  <button
                    onClick={() => handleDelete(endorsement.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove endorsement"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
