import { useEffect, useState } from "react";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getAllSkills,
  IndustryRole,
  CreateRoleDto,
} from "../../services/admin.service";
import {
  Search,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Sliders,
  FileText,
} from "lucide-react";

export function AdminRoleEditor() {
  const [roles, setRoles] = useState<IndustryRole[]>([]);
  const [skills, setSkills] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected / Active role state
  const [selectedRole, setSelectedRole] = useState<IndustryRole | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [roleTitle, setRoleTitle] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleRequirements, setRoleRequirements] = useState<Array<{ skillId: string; name: string; category: string; criticality: number }>>([]);

  // Search & Selector states
  const [roleSearch, setRoleSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  // Status notifications
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [rolesRes, skillsRes] = await Promise.all([listRoles(), getAllSkills()]);
        setRoles(rolesRes);
        setSkills(skillsRes);
        setError(null);
      } catch (err) {
        console.error("Error loading role editor data:", err);
        setError("Failed to load roles or skill lists.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update form fields when selected role changes
  useEffect(() => {
    if (selectedRole) {
      setIsCreatingNew(false);
      setRoleTitle(selectedRole.title);
      setRoleDesc(selectedRole.description || "");
      setRoleRequirements(
        selectedRole.requiredSkills.map((s) => ({
          skillId: s.id,
          name: s.name,
          category: s.category,
          criticality: s.criticality,
        }))
      );
      setSaveStatus(null);
    }
  }, [selectedRole]);

  // Handle switching to "Create New" mode
  const handleInitiateCreate = () => {
    setSelectedRole(null);
    setIsCreatingNew(true);
    setRoleTitle("");
    setRoleDesc("");
    setRoleRequirements([]);
    setSaveStatus(null);
  };

  // Add a skill to the requirements
  const handleAddRequirement = (skill: { id: string; name: string; category?: string }) => {
    if (roleRequirements.some((r) => r.skillId === skill.id)) return;
    setRoleRequirements([
      ...roleRequirements,
      {
        skillId: skill.id,
        name: skill.name,
        category: skill.category || "Uncategorized",
        criticality: 3.0, // Default mid criticality
      },
    ]);
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  // Remove a skill requirement
  const handleRemoveRequirement = (skillId: string) => {
    setRoleRequirements(roleRequirements.filter((r) => r.skillId !== skillId));
  };

  // Update requirement criticality value
  const handleCriticalityChange = (skillId: string, val: number) => {
    setRoleRequirements(
      roleRequirements.map((r) => (r.skillId === skillId ? { ...r, criticality: val } : r))
    );
  };

  // Submit create or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      setSaveStatus({ type: "error", message: "Role title is required." });
      return;
    }

    try {
      setSaving(true);
      setSaveStatus(null);

      const payload: CreateRoleDto = {
        title: roleTitle,
        description: roleDesc,
        requirements: roleRequirements.map((r) => ({
          skillId: r.skillId,
          criticality: r.criticality,
        })),
      };

      if (isCreatingNew) {
        const created = await createRole(payload);
        setSaveStatus({ type: "success", message: "Role created successfully!" });
        // Refresh roles list
        const updatedRoles = await listRoles();
        setRoles(updatedRoles);
        // Select newly created role
        const match = updatedRoles.find((r) => r.title === created.title);
        if (match) setSelectedRole(match);
      } else if (selectedRole) {
        await updateRole(selectedRole.id, payload);
        setSaveStatus({ type: "success", message: "Role updated successfully!" });
        // Refresh roles list
        const updatedRoles = await listRoles();
        setRoles(updatedRoles);
        // Reselect role
        const match = updatedRoles.find((r) => r.id === selectedRole.id);
        if (match) setSelectedRole(match);
      }
    } catch (err: any) {
      console.error("Error saving role:", err);
      const errMsg = err.response?.data?.error?.message || "Failed to save the role.";
      setSaveStatus({ type: "error", message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  // Delete a role
  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    if (!confirm(`Are you sure you want to delete the "${selectedRole.title}" role?`)) return;

    try {
      setSaving(true);
      await deleteRole(selectedRole.id);
      setSaveStatus(null);
      setSelectedRole(null);
      setIsCreatingNew(false);
      // Refresh list
      const updatedRoles = await listRoles();
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Error deleting role:", err);
      setSaveStatus({ type: "error", message: "Failed to delete the role." });
    } finally {
      setSaving(false);
    }
  };

  // Filters for role lists
  const filteredRoles = roles.filter((role) =>
    role.title.toLowerCase().includes(roleSearch.toLowerCase())
  );

  // Filters for skill search dropdown
  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !roleRequirements.some((r) => r.skillId === skill.id)
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading role requirements editor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
          <Sliders className="h-3.5 w-3.5 text-slate-600" />
          Admin
        </span>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Industry Role & Requirements Editor</h3>
        <p className="text-xs text-slate-500">Add custom roles, specify target skill criticalities, and manage expectations.</p>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Left Side: Roles List */}
        <div className="w-full shrink-0 border-slate-100 lg:w-64 lg:border-r lg:pr-6">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleInitiateCreate}
              className="flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-white transition-all hover:bg-indigo-700"
              title="Add Role"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* List Box */}
          <div className="mt-4 max-h-[300px] overflow-y-auto space-y-1 lg:max-h-[420px]">
            {filteredRoles.map((role) => {
              const isActive = selectedRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-all ${
                    isActive
                      ? "bg-slate-900 text-white font-medium shadow-sm"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="truncate font-semibold">{role.title}</div>
                  <div className={`truncate text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                    {role.requiredSkills.length} skills required
                  </div>
                </button>
              );
            })}
            {filteredRoles.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">No roles found.</p>
            )}
          </div>
        </div>

        {/* Right Side: Form / Editor */}
        <div className="flex-1">
          {selectedRole || isCreatingNew ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title & Desc */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Developer"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                  <input
                    type="text"
                    placeholder="Short summary of the role expectations..."
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Add Skill Section */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add Skill Requirement</label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search standard skills (e.g. React, Docker)..."
                    value={skillSearch}
                    onChange={(e) => {
                      setSkillSearch(e.target.value);
                      setShowSkillDropdown(true);
                    }}
                    onFocus={() => setShowSkillDropdown(true)}
                    className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Dropdown */}
                {showSkillDropdown && skillSearch.trim() && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-100 bg-white p-1 shadow-lg">
                    {filteredSkills.slice(0, 8).map((skill) => (
                      <button
                        type="button"
                        key={skill.id}
                        onClick={() => handleAddRequirement(skill)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50 text-slate-700"
                      >
                        <span className="font-semibold">{skill.name}</span>
                        {skill.category && (
                          <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                            {skill.category}
                          </span>
                        )}
                      </button>
                    ))}
                    {filteredSkills.length === 0 && (
                      <p className="text-center text-[11px] text-slate-400 py-3">No matching new skills.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Requirements List */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Required Skills & Weights ({roleRequirements.length})
                </label>
                <div className="mt-2 max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {roleRequirements.map((req) => (
                    <div key={req.skillId} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-slate-800">{req.name}</span>
                          <span className="shrink-0 text-[9px] bg-slate-50 px-1.5 py-0.2 rounded text-slate-500">
                            {req.category}
                          </span>
                        </div>
                      </div>

                      {/* Slider and Delete */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1.0"
                            max="5.0"
                            step="0.5"
                            value={req.criticality}
                            onChange={(e) => handleCriticalityChange(req.skillId, parseFloat(e.target.value))}
                            className="h-1.5 w-24 accent-indigo-600 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="w-8 text-[11px] font-bold text-slate-600 text-right">
                            {req.criticality.toFixed(1)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(req.skillId)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {roleRequirements.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8">
                      No skills required. Add skills above.
                    </div>
                  )}
                </div>
              </div>

              {/* Status Alert */}
              {saveStatus && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                  saveStatus.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                    : "bg-rose-50 text-rose-800 border border-rose-100"
                }`}>
                  {saveStatus.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{saveStatus.message}</span>
                </div>
              )}

              {/* Save & Delete Buttons */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                {selectedRole ? (
                  <button
                    type="button"
                    onClick={handleDeleteRole}
                    disabled={saving}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Role
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl">
              <FileText className="h-10 w-10 text-slate-300" />
              <h4 className="mt-3 text-sm font-bold text-slate-700">No Role Selected</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-[280px]">
                Select an industry role from the left menu to configure its requirements, or click the plus button to add a new role.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
