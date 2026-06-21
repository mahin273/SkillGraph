import { useEffect, useState } from "react";
import {
  listUniversities,
  createUniversity,
  updateUniversity,
  type University
} from "../../services/admin.service";
import {
  Plus,
  Edit2,
  Building2,
  Globe,
  Search,
  Loader2,
  AlertCircle,
  X,
  Check,
  GraduationCap,
  Users,
  Compass
} from "lucide-react";

export function UniversityManager() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [domainsInput, setDomainsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const data = await listUniversities();
      setUniversities(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load universities list:", err);
      setError("Failed to load universities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUniversities();
  }, []);

  const openOnboardModal = () => {
    setEditingUni(null);
    setName("");
    setShortName("");
    setCountry("Bangladesh");
    setDomainsInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (uni: University) => {
    setEditingUni(uni);
    setName(uni.name);
    setShortName(uni.shortName);
    setCountry(uni.country);
    setDomainsInput(uni.allowedDomains.join(", "));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) {
      alert("Name and Short Name are required.");
      return;
    }

    const domains = domainsInput
      .split(",")
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);

    try {
      setSubmitting(true);
      if (editingUni) {
        // Update university
        const updated = await updateUniversity(editingUni.id, {
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          country: country.trim(),
          allowedDomains: domains
        });
        setUniversities(prev =>
          prev.map(u => (u.id === editingUni.id ? { ...u, ...updated } : u))
        );
      } else {
        // Onboard new university
        const created = await createUniversity({
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          country: country.trim(),
          allowedDomains: domains
        });
        setUniversities(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving university config:", err);
      alert(err.response?.data?.message || "Failed to save university.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = universities.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.shortName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading university directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error}</p>
        <button
          onClick={() => void fetchUniversities()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[500px]">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            University Lifecycles ({universities.length})
          </span>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Academic Directory Onboarding</h3>
          <p className="text-xs text-slate-500">Add or configure universities to assign administrators, isolate scopes, and verify domains.</p>
        </div>
        
        <button
          onClick={openOnboardModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm shrink-0"
        >
          <Plus className="size-4" />
          Onboard University
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or short name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Grid List */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto pr-1">
        {filtered.map(uni => (
          <div
            key={uni.id}
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-[#fbfcfe] p-4 transition-all hover:shadow-md hover:border-slate-200"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  {uni.shortName}
                </span>
                <button
                  onClick={() => openEditModal(uni)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
              
              <h4 className="mt-2 text-sm font-bold text-slate-900 line-clamp-2">{uni.name}</h4>
              <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                <Globe className="size-3 text-slate-400" />
                {uni.country}
              </p>

              {/* Suffix Suffixes */}
              <div className="mt-3 flex flex-wrap gap-1">
                {uni.allowedDomains.map(domain => (
                  <span
                    key={domain}
                    className="inline-block text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                  >
                    @{domain}
                  </span>
                ))}
                {uni.allowedDomains.length === 0 && (
                  <span className="text-[9px] text-slate-400 italic">No restrictions (wildcard)</span>
                )}
              </div>
            </div>

            {/* Metrics Footer */}
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <div className="flex items-center gap-1" title="Users count">
                <Users className="size-3.5 text-slate-400" />
                <span>{uni._count?.users || 0} users</span>
              </div>
              <div className="flex items-center gap-1" title="Students count">
                <GraduationCap className="size-3.5 text-slate-400" />
                <span>{uni._count?.studentProfiles || 0} students</span>
              </div>
              <div className="flex items-center gap-1" title="Alumni count">
                <Compass className="size-3.5 text-slate-400" />
                <span>{uni._count?.alumniProfiles || 0} alumni</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl mt-6">
          <Building2 className="h-10 w-10 text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-700">No Universities Found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-[280px]">
            No universities matching your search queries were found in the directory.
          </p>
        </div>
      )}

      {/* Onboard / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUni ? "Update University Settings" : "Onboard New University"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">University Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United International University"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Short Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Name / Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UIU"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g. Bangladesh"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Allowed Domains */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Allowed Email Suffixes (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. uiu.edu.bd, student.uiu.edu.bd"
                  value={domainsInput}
                  onChange={e => setDomainsInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Leave blank to allow any email domain. Users registering with these suffixes will auto-link.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
