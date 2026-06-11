import { useEffect, useState } from "react";
import { getRoles } from "../../services/careerGps.service";

type RoleOption = {
  id: string;
  name: string;
  description?: string | null;
  requiredSkills: Array<{ name: string; criticality: number }>;
};

interface RoleSelectorProps {
  value: string | null;
  onChange: (roleId: string) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRoles()
      .then((nextRoles) => {
        setRoles(nextRoles);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load roles");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-[#787774]">Loading roles...</div>
    );
  }

  const selectedRole = roles.find((role) => role.id === value);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#17202a]">
          Target role
        </label>
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm text-[#17202a] shadow-sm outline-none transition focus:border-[#0c66e4] focus:ring-3 focus:ring-[#0c66e4]/15"
        >
          <option value="">Select a role...</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>

      <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] px-3 py-2">
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Role profile
              </p>
              <span className="text-xs font-medium text-[#0c66e4]">
                {selectedRole.requiredSkills.length} skills
              </span>
            </div>
            <p className="mt-1 text-sm text-[#17202a]">
              {selectedRole.description || "Curated industry skill path."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedRole.requiredSkills.slice(0, 5).map((skill) => (
                <span
                  key={skill.name}
                  className="rounded-md border border-[#dfe3ea] bg-white px-2 py-1 text-xs text-muted-foreground"
                >
                  {skill.name}
                </span>
              ))}
              {selectedRole.requiredSkills.length > 5 && (
                <span className="rounded-md border border-[#dfe3ea] bg-white px-2 py-1 text-xs text-muted-foreground">
                  +{selectedRole.requiredSkills.length - 5} more
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a role to calculate your current gap and learning sequence.
          </p>
        )}
      </div>
    </div>
  );
}
